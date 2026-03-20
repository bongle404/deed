-- ═══════════════════════════════════════════
--  DEED — Database Schema
--  Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── BUYERS ──────────────────────────────────
create table buyers (
  id                uuid primary key default uuid_generate_v4(),
  created_at        timestamptz default now(),

  -- Contact
  name              text not null,
  email             text not null,
  phone             text,

  -- Qualification
  max_price         integer not null,          -- borrowing ceiling in AUD
  min_price         integer default 0,         -- lower bound of search
  deposit           integer,                   -- deposit amount AUD
  monthly_income    integer,                   -- gross monthly income
  monthly_debts     integer default 0,
  has_preapproval   boolean default false,
  preapproval_amount integer,
  is_first_home     boolean default false,
  buying_with_partner boolean default false,

  -- Search preferences
  suburbs           text[],                    -- array of suburb names
  property_types    text[],                    -- house, unit, townhouse, land
  min_beds          integer default 1,
  min_baths         integer default 1,

  -- Verification status
  verified          boolean default false,
  verification_note text,

  -- Source
  utm_source        text
);

-- ── LISTINGS ────────────────────────────────
create table listings (
  id                uuid primary key default uuid_generate_v4(),
  created_at        timestamptz default now(),

  -- Seller contact
  seller_name       text not null,
  seller_email      text not null,
  seller_phone      text,

  -- Property details
  address           text not null,
  suburb            text not null,
  postcode          text,
  state             text default 'QLD',
  property_type     text,                      -- house, unit, townhouse, land
  bedrooms          integer,
  bathrooms         integer,
  car_spaces        integer,
  land_size         integer,                   -- sqm
  house_size        integer,                   -- sqm

  -- Pricing
  asking_price      integer not null,
  price_description text,                      -- e.g. "Offers over $850,000"

  -- Listing details
  description       text,
  features          text[],                    -- array of feature strings
  deadline          date,
  deadline_time     text default '17:00',

  -- Status
  status            text default 'active',     -- active, under_offer, sold, withdrawn
  stripe_session_id text,
  paid              boolean default false,

  -- Stats (updated by triggers)
  view_count        integer default 0,
  watcher_count     integer default 0,
  offer_count       integer default 0
);

-- ── OFFERS ──────────────────────────────────
create table offers (
  id                uuid primary key default uuid_generate_v4(),
  created_at        timestamptz default now(),

  -- Relations
  listing_id        uuid references listings(id) on delete cascade,
  buyer_id          uuid references buyers(id) on delete set null,

  -- Buyer details (denormalised for display)
  buyer_name        text not null,
  buyer_email       text not null,
  buyer_phone       text,

  -- Offer terms
  offer_price       integer not null,
  offer_type        text not null,             -- unconditional, finance, building_pest, both
  settlement_days   integer default 30,
  deposit_amount    integer,

  -- Conditions
  finance_condition boolean default false,
  finance_days      integer,
  building_pest_condition boolean default false,
  building_pest_days integer,

  -- Cover note
  cover_note        text,
  intended_use      text,                      -- owner_occupier, investment, both

  -- Strength score (0–100, calculated on insert)
  strength_score    integer default 0,
  strength_label    text default 'Fair',       -- Strong, Good, Fair, Weak

  -- Status
  status            text default 'pending',    -- pending, accepted, countered, declined
  seller_note       text,
  counter_price     integer
);

-- ── WATCHERS ────────────────────────────────
-- Buyers who save a listing to watch it
create table watchers (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  listing_id  uuid references listings(id) on delete cascade,
  buyer_id    uuid references buyers(id) on delete cascade,
  unique(listing_id, buyer_id)
);

-- ── NOTIFICATIONS LOG ───────────────────────
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  type        text,                            -- new_listing_match, new_offer, offer_accepted
  recipient   text,                            -- email address
  subject     text,
  sent        boolean default false,
  error       text
);

-- ═══════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════
-- For MVP: allow public insert (forms submit without auth)
-- Reads locked down — only via service role (server-side)

alter table buyers    enable row level security;
alter table listings  enable row level security;
alter table offers    enable row level security;
alter table watchers  enable row level security;

-- Anyone can insert (form submissions)
create policy "public can insert buyers"   on buyers   for insert with check (true);
create policy "public can insert listings" on listings for insert with check (true);
create policy "public can insert offers"   on offers   for insert with check (true);
create policy "public can insert watchers" on watchers for insert with check (true);

-- Anyone can read active listings (browse page)
create policy "public can read listings"  on listings  for select using (status = 'active');

-- Anyone can read buyers (for matching — tighten later with auth)
create policy "public can read buyers"    on buyers    for select using (true);

-- Offers readable by anyone for now (tighten to seller auth later)
create policy "public can read offers"    on offers    for select using (true);

-- ═══════════════════════════════════════════
--  OFFER STRENGTH TRIGGER
--  Auto-calculates strength_score on every offer insert
-- ═══════════════════════════════════════════
create or replace function calculate_offer_strength()
returns trigger as $$
declare
  score integer := 0;
  listing_price integer;
begin
  -- Get listing asking price
  select asking_price into listing_price from listings where id = new.listing_id;

  -- Offer type (40 pts)
  if new.offer_type = 'unconditional' then score := score + 40;
  elsif new.offer_type = 'finance' then score := score + 25;
  elsif new.offer_type = 'building_pest' then score := score + 30;
  else score := score + 15; -- both conditions
  end if;

  -- Price relative to asking (30 pts)
  if listing_price is not null and listing_price > 0 then
    if new.offer_price >= listing_price then score := score + 30;
    elsif new.offer_price >= listing_price * 0.97 then score := score + 20;
    elsif new.offer_price >= listing_price * 0.94 then score := score + 10;
    else score := score + 5;
    end if;
  end if;

  -- Deposit size (15 pts)
  if new.deposit_amount is not null and listing_price is not null and listing_price > 0 then
    if new.deposit_amount >= listing_price * 0.10 then score := score + 15;
    elsif new.deposit_amount >= listing_price * 0.05 then score := score + 8;
    else score := score + 3;
    end if;
  end if;

  -- Settlement speed (15 pts)
  if new.settlement_days <= 30 then score := score + 15;
  elsif new.settlement_days <= 45 then score := score + 10;
  elsif new.settlement_days <= 60 then score := score + 5;
  end if;

  new.strength_score := score;

  -- Label
  if score >= 80 then new.strength_label := 'Strong';
  elsif score >= 60 then new.strength_label := 'Good';
  elsif score >= 40 then new.strength_label := 'Fair';
  else new.strength_label := 'Weak';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger set_offer_strength
  before insert on offers
  for each row execute function calculate_offer_strength();

-- ═══════════════════════════════════════════
--  LISTING STATS TRIGGER
--  Keeps offer_count in sync automatically
-- ═══════════════════════════════════════════
create or replace function update_listing_offer_count()
returns trigger as $$
begin
  update listings
  set offer_count = (select count(*) from offers where listing_id = new.listing_id)
  where id = new.listing_id;
  return new;
end;
$$ language plpgsql;

create trigger sync_offer_count
  after insert on offers
  for each row execute function update_listing_offer_count();

-- ═══════════════════════════════════════════
--  WATCHER COUNT TRIGGER
-- ═══════════════════════════════════════════
create or replace function update_watcher_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update listings set watcher_count = watcher_count + 1 where id = new.listing_id;
  elsif TG_OP = 'DELETE' then
    update listings set watcher_count = watcher_count - 1 where id = old.listing_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger sync_watcher_count
  after insert or delete on watchers
  for each row execute function update_watcher_count();

-- ═══════════════════════════════════════════
--  BROKER PORTAL MIGRATION
--  Run this block in Supabase SQL Editor
--  after the initial schema has been applied
-- ═══════════════════════════════════════════

-- ── BROKERS ─────────────────────────────────
create table if not exists brokers (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz default now(),
  name            text not null,
  email           text not null unique,
  brokerage       text not null,
  asic_licence    text not null,
  phone           text,
  status          text default 'pending', -- pending, approved, suspended
  approved_at     timestamptz
);

alter table brokers enable row level security;
create policy "public can insert brokers"
  on brokers for insert with check (true);
-- No select policy — anon cannot read brokers table.
-- All broker reads go through service role in serverless functions.

-- ── BUYERS — broker portal columns ──────────
alter table buyers add column if not exists
  verification_method     text default 'self_reported';
  -- values: self_reported, broker_preapproval

alter table buyers add column if not exists
  verified_amount         bigint;
  -- bigint: supports pre-approvals above $2.1M without overflow

alter table buyers add column if not exists
  broker_id               uuid references brokers(id) on delete set null;

alter table buyers add column if not exists
  activation_token        text;
  -- UUID sent in activation email. Nulled out after use (replay prevention).

alter table buyers add column if not exists
  activation_token_expires_at  timestamptz;
  -- Set to now() + interval '7 days' on insert.

alter table buyers add column if not exists
  activation_complete     boolean default false;

alter table buyers add column if not exists
  verified_at             timestamptz;

-- ── max_price type safety ────────────────────
-- max_price is integer. Alter to bigint if any pre-approvals exceed $2.1M.
-- alter table buyers alter column max_price type bigint;
-- (Uncomment and run if needed before inserting large amounts.)
