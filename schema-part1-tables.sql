create extension if not exists "uuid-ossp";

create table buyers (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  phone text,
  max_price integer not null,
  min_price integer default 0,
  deposit integer,
  monthly_income integer,
  monthly_debts integer default 0,
  has_preapproval boolean default false,
  preapproval_amount integer,
  is_first_home boolean default false,
  buying_with_partner boolean default false,
  suburbs text[],
  property_types text[],
  min_beds integer default 1,
  min_baths integer default 1,
  verified boolean default false,
  verification_note text,
  utm_source text
);

create table listings (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  seller_name text not null,
  seller_email text not null,
  seller_phone text,
  address text not null,
  suburb text not null,
  postcode text,
  state text default 'QLD',
  property_type text,
  bedrooms integer,
  bathrooms integer,
  car_spaces integer,
  land_size integer,
  house_size integer,
  asking_price integer not null,
  price_description text,
  description text,
  features text[],
  deadline date,
  deadline_time text default '17:00',
  status text default 'active',
  stripe_session_id text,
  paid boolean default false,
  view_count integer default 0,
  watcher_count integer default 0,
  offer_count integer default 0
);

create table offers (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  listing_id uuid references listings(id) on delete cascade,
  buyer_id uuid references buyers(id) on delete set null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  offer_price integer not null,
  offer_type text not null,
  settlement_days integer default 30,
  deposit_amount integer,
  finance_condition boolean default false,
  finance_days integer,
  building_pest_condition boolean default false,
  building_pest_days integer,
  cover_note text,
  intended_use text,
  strength_score integer default 0,
  strength_label text default 'Fair',
  status text default 'pending',
  seller_note text,
  counter_price integer
);

create table watchers (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  listing_id uuid references listings(id) on delete cascade,
  buyer_id uuid references buyers(id) on delete cascade,
  unique(listing_id, buyer_id)
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  type text,
  recipient text,
  subject text,
  sent boolean default false,
  error text
);

alter table buyers enable row level security;
alter table listings enable row level security;
alter table offers enable row level security;
alter table watchers enable row level security;

create policy "public can insert buyers" on buyers for insert with check (true);
create policy "public can insert listings" on listings for insert with check (true);
create policy "public can insert offers" on offers for insert with check (true);
create policy "public can insert watchers" on watchers for insert with check (true);
create policy "public can read listings" on listings for select using (status = 'active');
create policy "public can read buyers" on buyers for select using (true);
create policy "public can read offers" on offers for select using (true);
