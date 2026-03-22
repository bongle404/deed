-- =============================================================================
-- DEED Phase 1 (AI Pricing Tool) — Supabase Schema Migration
-- =============================================================================
-- Run this in the Supabase SQL Editor (https://app.supabase.com → SQL Editor).
-- All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards — safe to
-- re-run at any time without side effects.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Section 1: comparable_sales_cache table
-- Stores Proptech Data API responses so we don't repeat paid API calls within
-- the 7-day TTL window. Cache key: (suburb, bedrooms, property_type).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comparable_sales_cache (
  id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  suburb         text         NOT NULL,
  bedrooms       integer      NOT NULL,
  property_type  text         NOT NULL DEFAULT 'house',
  fetched_at     timestamptz  NOT NULL DEFAULT now(),
  expires_at     timestamptz  NOT NULL,
  comp_count     integer      NOT NULL,
  comparables    jsonb        NOT NULL,
  low_price      integer,
  mid_price      integer,
  high_price     integer,
  confidence     text         CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW'))
);

CREATE INDEX IF NOT EXISTS idx_comparable_sales_cache_lookup
  ON comparable_sales_cache (suburb, bedrooms, property_type, expires_at);

-- ---------------------------------------------------------------------------
-- Section 2: Add AI price estimate columns to listings table
-- Populated when a seller requests a price estimate; stored so we don't
-- re-call Proptech Data on every page load.
-- ---------------------------------------------------------------------------
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS price_estimate_low         integer,
  ADD COLUMN IF NOT EXISTS price_estimate_mid         integer,
  ADD COLUMN IF NOT EXISTS price_estimate_high        integer,
  ADD COLUMN IF NOT EXISTS price_estimate_confidence  text,
  ADD COLUMN IF NOT EXISTS price_estimate_fetched_at  timestamptz;

-- ---------------------------------------------------------------------------
-- Section 3: Add below-floor detection columns to offers table
-- Populated by the /api/offer-floor handler when a submitted offer is
-- significantly below the AI price estimate.
-- ---------------------------------------------------------------------------
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS below_floor         boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS below_floor_reason  text;
