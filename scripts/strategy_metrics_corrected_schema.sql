-- CORRECTED schema for strategy_metrics table
-- This is the proper schema with composite primary key for daily snapshots

create table public.strategy_metrics (
  strategy_id uuid not null,
  as_of_date date not null,
  last_close numeric null,
  prev_close numeric null,
  change_abs numeric null,
  change_pct numeric null,
  r_1w numeric null,
  r_1m numeric null,
  r_3m numeric null,
  r_6m numeric null,
  r_ytd numeric null,
  r_1y numeric null,
  r_3y numeric(10, 6) null default null::numeric,
  r_all_time numeric(10, 6) null default null::numeric,
  volatility_30d numeric null,
  updated_at timestamp with time zone null default now(),
  as_of timestamp with time zone null,
  holdings_live jsonb null,
  portfolio_value numeric null,
  benchmark_symbol text null,
  benchmark_return_1d numeric null,
  benchmark_return_1w numeric null,
  benchmark_return_1m numeric null,
  benchmark_return_3m numeric null,
  benchmark_return_ytd numeric null,
  strategy_return_1d numeric null,
  strategy_return_1w numeric null,
  strategy_return_1m numeric null,
  strategy_return_3m numeric null,
  strategy_return_ytd numeric null,
  alpha_1m numeric null,
  alpha_3m numeric null,
  alpha_ytd numeric null,
  error text null,
  computed_at timestamp with time zone null,
  -- FIXED: Changed primary key from (strategy_id) to (strategy_id, as_of_date)
  -- This allows storing multiple daily snapshots per strategy
  constraint strategy_metrics_pkey primary key (strategy_id, as_of_date),
  constraint strategy_metrics_strategy_id_fkey foreign key (strategy_id) references strategies (id) on delete cascade
) tablespace pg_default;

-- Indexes for efficient querying
create index IF not exists idx_strategy_metrics_as_of_date
on public.strategy_metrics using btree (as_of_date) tablespace pg_default;

create index IF not exists idx_strategy_metrics_strategy_date
on public.strategy_metrics using btree (strategy_id, as_of_date desc) tablespace pg_default;

create index IF not exists idx_strategy_metrics_r_ytd
on public.strategy_metrics using btree (r_ytd) tablespace pg_default;

create index IF not exists idx_strategy_metrics_r_1y
on public.strategy_metrics using btree (r_1y) tablespace pg_default;

create index IF not exists idx_strategy_metrics_r_3y
on public.strategy_metrics using btree (r_3y) tablespace pg_default;

create index IF not exists idx_strategy_metrics_r_all_time
on public.strategy_metrics using btree (r_all_time) tablespace pg_default;
