import type { DbClient } from "./db";
import {
  asRecord,
  normalizeDate,
  normalizeInteger,
  normalizeNumber,
  normalizeString,
  normalizeTimestamp,
  type JsonRecord
} from "./normalizers";

export type ImportError = {
  item?: string;
  activo?: string;
  error: string;
};

export function buildWhere(
  searchParams: URLSearchParams,
  allowedFilters: string[],
  startIndex = 1
) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let index = startIndex;

  for (const filter of allowedFilters) {
    const value = searchParams.get(filter);

    if (value) {
      clauses.push(`${filter} = $${index}`);
      params.push(value);
      index += 1;
    }
  }

  return {
    where: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
    clauses,
    params,
    nextIndex: index
  };
}

export async function upsertAsset(client: DbClient, asset: JsonRecord) {
  const metadata = asRecord(asset.metadata);
  const activo = normalizeString(asset.activo);

  if (!activo) {
    throw new Error("Missing activo");
  }

  await client.query(
    `
      insert into rf_assets (
        activo,
        ticker,
        tipo_data912,
        subasset_class,
        status,
        source,
        nominal_units,
        total_cashflow_records,
        metadata,
        source_updated_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, now())
      on conflict (activo) do update set
        ticker = coalesce(excluded.ticker, rf_assets.ticker),
        tipo_data912 = coalesce(excluded.tipo_data912, rf_assets.tipo_data912),
        subasset_class = coalesce(excluded.subasset_class, rf_assets.subasset_class),
        status = coalesce(excluded.status, rf_assets.status),
        source = coalesce(excluded.source, rf_assets.source),
        nominal_units = coalesce(excluded.nominal_units, rf_assets.nominal_units),
        total_cashflow_records = coalesce(excluded.total_cashflow_records, rf_assets.total_cashflow_records),
        metadata = coalesce(excluded.metadata, rf_assets.metadata),
        source_updated_at = coalesce(excluded.source_updated_at, rf_assets.source_updated_at),
        updated_at = now()
    `,
    [
      activo,
      normalizeString(asset.ticker) ?? activo,
      normalizeString(asset.tipo_data912),
      normalizeString(asset.subasset_class) ??
        normalizeString(metadata?.subasset_class),
      normalizeString(asset.status) ?? normalizeString(asset.estado),
      normalizeString(asset.source),
      normalizeNumber(asset.nominal_units),
      normalizeInteger(asset.total_cashflow_records) ??
        normalizeInteger(metadata?.total_records),
      metadata ? JSON.stringify(metadata) : null,
      normalizeTimestamp(asset.source_updated_at ?? asset.updated_at)
    ]
  );
}

export async function upsertMetricLatest(client: DbClient, metric: JsonRecord) {
  const activo = normalizeString(metric.activo);

  if (!activo) {
    throw new Error("Missing activo");
  }

  await client.query(
    `
      insert into rf_metrics_latest (
        activo,
        estado,
        px,
        tir,
        tir_pct,
        duration,
        modified_duration,
        convexity,
        delta_p_mas_100bps,
        delta_p_menos_100bps,
        delta_pct_mas_100bps,
        delta_pct_menos_100bps,
        subasset_class,
        tipo_data912,
        px_input,
        px_input_currency,
        px_calc,
        px_calc_currency,
        fx_mep,
        fx_source,
        price_scale_to_input,
        next_payment_date,
        last_payment_date,
        future_cashflows_count,
        nominal_units,
        tir_tipo,
        day_count,
        compounding,
        shock_bps,
        pv_check,
        notas,
        raw,
        source_updated_at,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31, $32::jsonb,
        $33, now()
      )
      on conflict (activo) do update set
        estado = excluded.estado,
        px = excluded.px,
        tir = excluded.tir,
        tir_pct = excluded.tir_pct,
        duration = excluded.duration,
        modified_duration = excluded.modified_duration,
        convexity = excluded.convexity,
        delta_p_mas_100bps = excluded.delta_p_mas_100bps,
        delta_p_menos_100bps = excluded.delta_p_menos_100bps,
        delta_pct_mas_100bps = excluded.delta_pct_mas_100bps,
        delta_pct_menos_100bps = excluded.delta_pct_menos_100bps,
        subasset_class = excluded.subasset_class,
        tipo_data912 = excluded.tipo_data912,
        px_input = excluded.px_input,
        px_input_currency = excluded.px_input_currency,
        px_calc = excluded.px_calc,
        px_calc_currency = excluded.px_calc_currency,
        fx_mep = excluded.fx_mep,
        fx_source = excluded.fx_source,
        price_scale_to_input = excluded.price_scale_to_input,
        next_payment_date = excluded.next_payment_date,
        last_payment_date = excluded.last_payment_date,
        future_cashflows_count = excluded.future_cashflows_count,
        nominal_units = excluded.nominal_units,
        tir_tipo = excluded.tir_tipo,
        day_count = excluded.day_count,
        compounding = excluded.compounding,
        shock_bps = excluded.shock_bps,
        pv_check = excluded.pv_check,
        notas = excluded.notas,
        raw = excluded.raw,
        source_updated_at = excluded.source_updated_at,
        updated_at = now()
    `,
    [
      activo,
      normalizeString(metric.estado),
      normalizeNumber(metric.px),
      normalizeNumber(metric.tir),
      normalizeNumber(metric.tir_pct),
      normalizeNumber(metric.duration),
      normalizeNumber(metric.modified_duration),
      normalizeNumber(metric.convexity),
      normalizeNumber(metric.delta_p_mas_100bps),
      normalizeNumber(metric.delta_p_menos_100bps),
      normalizeNumber(metric.delta_pct_mas_100bps),
      normalizeNumber(metric.delta_pct_menos_100bps),
      normalizeString(metric.subasset_class),
      normalizeString(metric.tipo_data912),
      normalizeNumber(metric.px_input),
      normalizeString(metric.px_input_currency),
      normalizeNumber(metric.px_calc),
      normalizeString(metric.px_calc_currency),
      normalizeNumber(metric.fx_mep),
      normalizeString(metric.fx_source),
      normalizeNumber(metric.price_scale_to_input),
      normalizeDate(metric.next_payment_date),
      normalizeDate(metric.last_payment_date),
      normalizeInteger(metric.future_cashflows_count),
      normalizeNumber(metric.nominal_units),
      normalizeString(metric.tir_tipo),
      normalizeString(metric.day_count),
      normalizeString(metric.compounding),
      normalizeNumber(metric.shock_bps),
      normalizeNumber(metric.pv_check),
      normalizeString(metric.notas),
      JSON.stringify(metric),
      normalizeTimestamp(metric.source_updated_at ?? metric.updated_at)
    ]
  );
}

export async function upsertCashflow(
  client: DbClient,
  activo: string,
  cashflow: JsonRecord,
  source: string | null,
  sourceUpdatedAt: string | null
) {
  const fecha = normalizeDate(cashflow.fecha ?? cashflow.payment_date);

  if (!fecha) {
    throw new Error("Missing fecha");
  }

  await client.query(
    `
      insert into rf_cashflows (
        activo,
        fecha,
        issue_date,
        valor_residual,
        cap_actualizado,
        interes,
        capital,
        cupon,
        interest_rate,
        raw,
        source,
        source_updated_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, now())
      on conflict (activo, fecha) do update set
        issue_date = excluded.issue_date,
        valor_residual = excluded.valor_residual,
        cap_actualizado = excluded.cap_actualizado,
        interes = excluded.interes,
        capital = excluded.capital,
        cupon = excluded.cupon,
        interest_rate = excluded.interest_rate,
        raw = excluded.raw,
        source = excluded.source,
        source_updated_at = excluded.source_updated_at,
        updated_at = now()
    `,
    [
      activo,
      fecha,
      normalizeDate(cashflow.issue_date),
      normalizeNumber(cashflow.valor_residual),
      normalizeNumber(cashflow.cap_actualizado),
      normalizeNumber(cashflow.interes),
      normalizeNumber(cashflow.capital),
      normalizeNumber(cashflow.cupon),
      normalizeNumber(cashflow.interest_rate),
      JSON.stringify(asRecord(cashflow.raw) ?? cashflow),
      source,
      sourceUpdatedAt
    ]
  );

  return fecha;
}
