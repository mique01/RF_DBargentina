create table if not exists rf_assets (
  activo text primary key,

  ticker text,
  tipo_data912 text,
  subasset_class text,

  status text,
  source text,

  nominal_units numeric,
  total_cashflow_records integer,

  metadata jsonb,

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
  convexity numeric,

  delta_p_mas_100bps numeric,
  delta_p_menos_100bps numeric,
  delta_pct_mas_100bps numeric,
  delta_pct_menos_100bps numeric,

  subasset_class text,
  tipo_data912 text,

  px_input numeric,
  px_input_currency text,
  px_calc numeric,
  px_calc_currency text,

  fx_mep numeric,
  fx_source text,

  price_scale_to_input numeric,

  next_payment_date date,
  last_payment_date date,
  future_cashflows_count integer,

  nominal_units numeric,

  tir_tipo text,
  day_count text,
  compounding text,
  shock_bps numeric,

  pv_check numeric,
  notas text,

  raw jsonb,

  source_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists rf_cashflows (
  activo text references rf_assets(activo) on delete cascade,
  fecha date,

  issue_date date,

  valor_residual numeric,
  cap_actualizado numeric,

  interes numeric,
  capital numeric,
  cupon numeric,
  interest_rate numeric,

  raw jsonb,

  source text,
  source_updated_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  primary key (activo, fecha)
);

create index if not exists idx_rf_metrics_latest_estado
on rf_metrics_latest (estado);

create index if not exists idx_rf_metrics_latest_tipo_data912
on rf_metrics_latest (tipo_data912);

create index if not exists idx_rf_cashflows_fecha
on rf_cashflows (fecha);

create index if not exists idx_rf_cashflows_activo_fecha
on rf_cashflows (activo, fecha);
