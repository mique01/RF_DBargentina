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
        priority,
        nominal_units,
        total_cashflow_records,
        source_updated_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
      on conflict (activo) do update set
        ticker = coalesce(excluded.ticker, rf_assets.ticker),
        tipo_data912 = coalesce(excluded.tipo_data912, rf_assets.tipo_data912),
        subasset_class = coalesce(excluded.subasset_class, rf_assets.subasset_class),
        status = coalesce(excluded.status, rf_assets.status),
        source = coalesce(excluded.source, rf_assets.source),
        priority = coalesce(excluded.priority, rf_assets.priority),
        nominal_units = coalesce(excluded.nominal_units, rf_assets.nominal_units),
        total_cashflow_records = coalesce(excluded.total_cashflow_records, rf_assets.total_cashflow_records),
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
      normalizeInteger(asset.priority),
      normalizeNumber(asset.nominal_units),
      normalizeInteger(asset.total_cashflow_records) ??
        normalizeInteger(metadata?.total_records),
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
        delta_p_mas_100bps,
        delta_p_menos_100bps,
        subasset_class,
        tipo_data912,
        priority,
        next_payment_date,
        last_payment_date,
        future_cashflows_count,
        nominal_units,
        source_updated_at,
        updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17,
        now()
      )
      on conflict (activo) do update set
        estado = excluded.estado,
        px = excluded.px,
        tir = excluded.tir,
        tir_pct = excluded.tir_pct,
        duration = excluded.duration,
        modified_duration = excluded.modified_duration,
        delta_p_mas_100bps = excluded.delta_p_mas_100bps,
        delta_p_menos_100bps = excluded.delta_p_menos_100bps,
        subasset_class = excluded.subasset_class,
        tipo_data912 = excluded.tipo_data912,
        priority = excluded.priority,
        next_payment_date = excluded.next_payment_date,
        last_payment_date = excluded.last_payment_date,
        future_cashflows_count = excluded.future_cashflows_count,
        nominal_units = excluded.nominal_units,
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
      normalizeNumber(metric.delta_p_mas_100bps),
      normalizeNumber(metric.delta_p_menos_100bps),
      normalizeString(metric.subasset_class),
      normalizeString(metric.tipo_data912),
      normalizeInteger(metric.priority),
      normalizeDate(metric.next_payment_date),
      normalizeDate(metric.last_payment_date),
      normalizeInteger(metric.future_cashflows_count),
      normalizeNumber(metric.nominal_units),
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

  if (fecha < new Date().toISOString().slice(0, 10)) {
    return null;
  }

  await client.query(
    `
      insert into rf_cashflows (
        activo,
        fecha,
        valor_residual,
        interes,
        capital,
        cupon,
        source_updated_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, now())
      on conflict (activo, fecha) do update set
        valor_residual = excluded.valor_residual,
        interes = excluded.interes,
        capital = excluded.capital,
        cupon = excluded.cupon,
        source_updated_at = excluded.source_updated_at,
        updated_at = now()
    `,
    [
      activo,
      fecha,
      normalizeNumber(cashflow.valor_residual),
      normalizeNumber(cashflow.interes),
      normalizeNumber(cashflow.capital),
      normalizeNumber(cashflow.cupon),
      sourceUpdatedAt
    ]
  );

  return fecha;
}
