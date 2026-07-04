alter table if exists rf_assets
  add column if not exists priority integer;

alter table if exists rf_metrics_latest
  add column if not exists priority integer;

delete from rf_cashflows
where fecha < current_date;

create index if not exists idx_rf_assets_priority
on rf_assets (priority);

create index if not exists idx_rf_metrics_latest_priority
on rf_metrics_latest (priority);

analyze rf_assets;
analyze rf_metrics_latest;
analyze rf_cashflows;
