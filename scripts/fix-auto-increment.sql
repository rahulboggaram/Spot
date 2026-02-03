-- SQL script to fix auto-increment for market_prices table
-- Run this in Supabase SQL Editor

-- Step 1: Create the sequence
CREATE SEQUENCE IF NOT EXISTS market_prices_id_seq;

-- Step 2: Set the sequence to start from the current max ID + 1
SELECT setval('market_prices_id_seq', COALESCE((SELECT MAX(id) FROM market_prices), 0) + 1, false);

-- Step 3: Link the sequence to the id column as default
ALTER TABLE market_prices 
ALTER COLUMN id SET DEFAULT nextval('market_prices_id_seq');

-- Step 4: Verify it works (this should show the next ID that will be used)
SELECT nextval('market_prices_id_seq');

