alter table if exists rf_assets
  drop column if exists metadata;

alter table if exists rf_metrics_latest
  drop column if exists convexity,
  drop column if exists delta_pct_mas_100bps,
  drop column if exists delta_pct_menos_100bps,
  drop column if exists px_input,
  drop column if exists px_input_currency,
  drop column if exists px_calc,
  drop column if exists px_calc_currency,
  drop column if exists fx_mep,
  drop column if exists fx_source,
  drop column if exists price_scale_to_input,
  drop column if exists tir_tipo,
  drop column if exists day_count,
  drop column if exists compounding,
  drop column if exists shock_bps,
  drop column if exists pv_check,
  drop column if exists notas,
  drop column if exists raw;

alter table if exists rf_cashflows
  drop column if exists issue_date,
  drop column if exists cap_actualizado,
  drop column if exists interest_rate,
  drop column if exists raw,
  drop column if exists source;

analyze rf_assets;
analyze rf_metrics_latest;
analyze rf_cashflows;
