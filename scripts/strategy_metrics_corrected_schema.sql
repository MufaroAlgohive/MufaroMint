-- UPDATED schema for strategy_metrics table
-- Daily snapshots with returns in both % and PnL format
-- composite primary key (strategy_id, as_of_date) for daily snapshots per strategy

create table public.strategy_metrics (
  strategy_id uuid not null,
  as_of_date date not null,
  -- Daily snapshot data
  portfolio_value numeric null,
  daily_pnl numeric null,
  change_pct numeric null,
  -- Holdings captured as-is for each day
  holdings_live jsonb null,
  -- Return periods in percentage format
  r_1d_pct numeric null,
  r_1w_pct numeric null,
  r_1m_pct numeric null,
  r_3m_pct numeric null,
  r_6m_pct numeric null,
  r_ytd_pct numeric null,
  r_1y_pct numeric null,
  r_3y_pct numeric(10, 6) null,
  r_all_time_pct numeric(10, 6) null,
  -- Return periods in PnL (absolute $ amount) format
  r_1d_pnl numeric null,
  r_1w_pnl numeric null,
  r_1m_pnl numeric null,
  r_3m_pnl numeric null,
  r_6m_pnl numeric null,
  r_ytd_pnl numeric null,
  r_1y_pnl numeric null,
  r_3y_pnl numeric null,
  r_all_time_pnl numeric null,
  -- Benchmark returns in percentage
  benchmark_symbol text null,
  benchmark_return_1d_pct numeric null,
  benchmark_return_1w_pct numeric null,
  benchmark_return_1m_pct numeric null,
  benchmark_return_3m_pct numeric null,
  benchmark_return_ytd_pct numeric null,
  -- Strategy returns in percentage
  strategy_return_1d_pct numeric null,
  strategy_return_1w_pct numeric null,
  strategy_return_1m_pct numeric null,
  strategy_return_3m_pct numeric null,
  strategy_return_ytd_pct numeric null,
  -- Alpha (outperformance vs benchmark)
  alpha_1m numeric null,
  alpha_3m numeric null,
  alpha_ytd numeric null,
  -- Metadata
  volatility_30d numeric null,
  error text null,
  computed_at timestamp with time zone null,
  updated_at timestamp with time zone null default now(),
  as_of timestamp with time zone null,
  constraint strategy_metrics_pkey primary key (strategy_id, as_of_date),
  constraint strategy_metrics_strategy_id_fkey foreign key (strategy_id) references strategies (id) on delete cascade
) tablespace pg_default;

-- Indexes for efficient querying
create index IF not exists idx_strategy_metrics_as_of_date
on public.strategy_metrics using btree (as_of_date) tablespace pg_default;

create index IF not exists idx_strategy_metrics_strategy_date
on public.strategy_metrics using btree (strategy_id, as_of_date desc) tablespace pg_default;

create index IF not exists idx_strategy_metrics_r_ytd_pct
on public.strategy_metrics using btree (r_ytd_pct) tablespace pg_default;

create index IF not exists idx_strategy_metrics_r_1y_pct
on public.strategy_metrics using btree (r_1y_pct) tablespace pg_default;

create index IF not exists idx_strategy_metrics_r_3y_pct
on public.strategy_metrics using btree (r_3y_pct) tablespace pg_default;

create index IF not exists idx_strategy_metrics_r_all_time_pct
on public.strategy_metrics using btree (r_all_time_pct) tablespace pg_default;
