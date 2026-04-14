-- Migration: Fix strategy_metrics primary key to support daily snapshots
-- Current issue: PK is only (strategy_id), which prevents storing multiple days per strategy
-- Solution: Change PK to (strategy_id, as_of_date) to allow historical daily snapshots

-- Step 1: Drop the old primary key constraint
ALTER TABLE public.strategy_metrics DROP CONSTRAINT strategy_metrics_pkey CASCADE;

-- Step 2: Create the new composite primary key
ALTER TABLE public.strategy_metrics
ADD CONSTRAINT strategy_metrics_pkey PRIMARY KEY (strategy_id, as_of_date);

-- Step 3: Add index on as_of_date for time-range queries
CREATE INDEX IF NOT EXISTS idx_strategy_metrics_as_of_date
ON public.strategy_metrics USING btree (as_of_date) TABLESPACE pg_default;

-- Step 4: Add index on strategy_id, as_of_date for efficient lookups
CREATE INDEX IF NOT EXISTS idx_strategy_metrics_strategy_date
ON public.strategy_metrics USING btree (strategy_id, as_of_date DESC) TABLESPACE pg_default;

-- Step 5: Keep existing return indexes
CREATE INDEX IF NOT EXISTS idx_strategy_metrics_r_ytd
ON public.strategy_metrics USING btree (r_ytd) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_strategy_metrics_r_1y
ON public.strategy_metrics USING btree (r_1y) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_strategy_metrics_r_3y
ON public.strategy_metrics USING btree (r_3y) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_strategy_metrics_r_all_time
ON public.strategy_metrics USING btree (r_all_time) TABLESPACE pg_default;
