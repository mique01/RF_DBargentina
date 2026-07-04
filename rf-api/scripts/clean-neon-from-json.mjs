import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const metricsPath = process.argv[2];
const cashflowsPath = process.argv[3];

if (!metricsPath || !cashflowsPath) {
  console.error(
    "Usage: node scripts/clean-neon-from-json.mjs <RF_ArgentinaDatos.json> <bond_cashflows.json>"
  );
  process.exit(1);
}

const envPath = path.join(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const [key, ...valueParts] = line.split("=");
    process.env[key] = valueParts.join("=");
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const metricsBody = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
const cashflowsBody = JSON.parse(fs.readFileSync(cashflowsPath, "utf8"));

const metricsRecords = Array.isArray(metricsBody.records)
  ? metricsBody.records
  : Object.values(metricsBody.instruments || {});
const cashflowActivos = Object.keys(cashflowsBody.instruments || {}).filter(Boolean);

const normalizeString = (value) =>
  value === null || value === undefined || value === "" ? null : String(value);
const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const normalizeInteger = (value) => {
  const parsed = normalizeNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
};
const normalizeDate = (value) => {
  const text = normalizeString(value);
  const match = text?.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
};
const normalizeTimestamp = (value) => {
  const text = normalizeString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const metricRows = metricsRecords
  .map((record, index) => ({
    activo: normalizeString(record.activo),
    priority: index + 1,
    estado: normalizeString(record.estado),
    px: normalizeNumber(record.px),
    tir: normalizeNumber(record.tir),
    tir_pct: normalizeNumber(record.tir_pct),
    duration: normalizeNumber(record.duration),
    modified_duration: normalizeNumber(record.modified_duration),
    delta_p_mas_100bps: normalizeNumber(record.delta_p_mas_100bps),
    delta_p_menos_100bps: normalizeNumber(record.delta_p_menos_100bps),
    subasset_class: normalizeString(record.subasset_class),
    tipo_data912: normalizeString(record.tipo_data912),
    next_payment_date: normalizeDate(record.next_payment_date),
    last_payment_date: normalizeDate(record.last_payment_date),
    future_cashflows_count: normalizeInteger(record.future_cashflows_count),
    nominal_units: normalizeNumber(record.nominal_units),
    source_updated_at: normalizeTimestamp(record.updated_at)
  }))
  .filter((row) => row.activo);

const metricActivos = metricRows.map((row) => row.activo);
const column = (key) => metricRows.map((row) => row[key]);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  enableChannelBinding: true
});

try {
  await client.connect();
  await client.query("begin");

  const deletedMetrics = await client.query(
    "delete from rf_metrics_latest where not (activo = any($1::text[]))",
    [metricActivos]
  );

  const deletedOldCashflows = await client.query(
    "delete from rf_cashflows where fecha < current_date"
  );

  const deletedUnknownCashflows = await client.query(
    "delete from rf_cashflows where not (activo = any($1::text[]))",
    [cashflowActivos]
  );

  const deletedAssets = await client.query(
    "delete from rf_assets where not (activo = any($1::text[]))",
    [metricActivos]
  );

  const assetPriority = await client.query(
    `
      with incoming as (
        select *
        from unnest($1::text[], $2::integer[]) as t(activo, priority)
      )
      update rf_assets a
      set priority = i.priority, updated_at = now()
      from incoming i
      where a.activo = i.activo
    `,
    [column("activo"), column("priority")]
  );

  const metricPriority = await client.query(
    `
      with incoming as (
        select *
        from unnest(
          $1::text[], $2::integer[], $3::text[], $4::numeric[], $5::numeric[],
          $6::numeric[], $7::numeric[], $8::numeric[], $9::numeric[],
          $10::numeric[], $11::text[], $12::text[], $13::date[], $14::date[],
          $15::integer[], $16::numeric[], $17::timestamptz[]
        ) as t(
          activo, priority, estado, px, tir, tir_pct, duration,
          modified_duration, delta_p_mas_100bps, delta_p_menos_100bps,
          subasset_class, tipo_data912, next_payment_date, last_payment_date,
          future_cashflows_count, nominal_units, source_updated_at
        )
      )
      update rf_metrics_latest m
      set
        priority = i.priority,
        estado = i.estado,
        px = i.px,
        tir = i.tir,
        tir_pct = i.tir_pct,
        duration = i.duration,
        modified_duration = i.modified_duration,
        delta_p_mas_100bps = i.delta_p_mas_100bps,
        delta_p_menos_100bps = i.delta_p_menos_100bps,
        subasset_class = i.subasset_class,
        tipo_data912 = i.tipo_data912,
        next_payment_date = i.next_payment_date,
        last_payment_date = i.last_payment_date,
        future_cashflows_count = i.future_cashflows_count,
        nominal_units = i.nominal_units,
        source_updated_at = i.source_updated_at,
        updated_at = now()
      from incoming i
      where m.activo = i.activo
    `,
    [
      column("activo"),
      column("priority"),
      column("estado"),
      column("px"),
      column("tir"),
      column("tir_pct"),
      column("duration"),
      column("modified_duration"),
      column("delta_p_mas_100bps"),
      column("delta_p_menos_100bps"),
      column("subasset_class"),
      column("tipo_data912"),
      column("next_payment_date"),
      column("last_payment_date"),
      column("future_cashflows_count"),
      column("nominal_units"),
      column("source_updated_at")
    ]
  );

  await client.query("analyze rf_assets");
  await client.query("analyze rf_metrics_latest");
  await client.query("analyze rf_cashflows");

  const counts = await client.query(`
    select
      (select count(*)::int from rf_assets) as assets,
      (select count(*)::int from rf_metrics_latest) as metrics,
      (select count(*)::int from rf_cashflows) as cashflows,
      (select count(*)::int from rf_cashflows where fecha < current_date) as past_cashflows
  `);

  await client.query("commit");

  console.log(
    JSON.stringify(
      {
        deleted_metrics: deletedMetrics.rowCount,
        deleted_old_cashflows: deletedOldCashflows.rowCount,
        deleted_unknown_cashflows: deletedUnknownCashflows.rowCount,
        deleted_assets: deletedAssets.rowCount,
        asset_priority_updated: assetPriority.rowCount,
        metric_priority_updated: metricPriority.rowCount,
        counts: counts.rows[0]
      },
      null,
      2
    )
  );
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
