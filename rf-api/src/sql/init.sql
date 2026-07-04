create table if not exists rf_assets (
  activo text primary key,

  ticker text,
  tipo_data912 text,
  subasset_class text,
  status text,
  source text,
  priority integer,

  nominal_units numeric,
  total_cashflow_records integer,

  source_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists rf_metrics_latest (
  activo text primary key references rf_assets(activo) on delete cascade,

  estado text,
  px numeric,
  tir numeric,
  tir_pct numeric,
  duration numeric,
  modified_duration numeric,

  delta_p_mas_100bps numeric,
  delta_p_menos_100bps numeric,

  subasset_class text,
  tipo_data912 text,
  priority integer,

  next_payment_date date,
  last_payment_date date,
  future_cashflows_count integer,
  nominal_units numeric,

  source_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists rf_cashflows (
  activo text references rf_assets(activo) on delete cascade,
  fecha date,

  valor_residual numeric,
  interes numeric,
  capital numeric,
  cupon numeric,

  source_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  primary key (activo, fecha)
);

create index if not exists idx_rf_metrics_latest_estado
on rf_metrics_latest (estado);

create index if not exists idx_rf_metrics_latest_tipo_data912
on rf_metrics_latest (tipo_data912);

create index if not exists idx_rf_assets_priority
on rf_assets (priority);

create index if not exists idx_rf_metrics_latest_priority
on rf_metrics_latest (priority);

create index if not exists idx_rf_cashflows_fecha
on rf_cashflows (fecha);

create index if not exists idx_rf_cashflows_activo_fecha
on rf_cashflows (activo, fecha);
