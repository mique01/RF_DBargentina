import { query } from "@/lib/db";
import { normalizeDate } from "@/lib/normalizers";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

type CashflowRow = {
  ticker: string;
  fecha: string | Date;
  valor_residual: string | number | null;
  interes: string | number | null;
  capital: string | number | null;
  cupon: string | number | null;
};

type Cashflow = {
  fecha: string;
  valor_residual: number | null;
  interes: number | null;
  capital: number | null;
  cupon: number | null;
};

type CashflowGroup = {
  ticker: string;
  cashflows: Cashflow[];
};

function parseTickers(value: string | null) {
  return value
    ?.split(",")
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean);
}

function toNumber(value: string | number | null) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateOnly(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function groupCashflows(rows: CashflowRow[]) {
  const grouped = new Map<string, CashflowGroup>();

  for (const row of rows) {
    if (!grouped.has(row.ticker)) {
      grouped.set(row.ticker, { ticker: row.ticker, cashflows: [] });
    }

    grouped.get(row.ticker)?.cashflows.push({
      fecha: toDateOnly(row.fecha),
      valor_residual: toNumber(row.valor_residual),
      interes: toNumber(row.interes),
      capital: toNumber(row.capital),
      cupon: toNumber(row.cupon)
    });
  }

  return Array.from(grouped.values());
}

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const clauses: string[] = [];
  const params: unknown[] = [];
  let tickersParamIndex: number | null = null;

  const activo = searchParams.get("activo");
  const tickers = parseTickers(searchParams.get("tickers"));
  const from = normalizeDate(searchParams.get("from"));
  const to = normalizeDate(searchParams.get("to"));

  if (activo) {
    params.push(activo.toUpperCase());
    clauses.push(`c.activo = $${params.length}`);
  }

  if (!activo && tickers && tickers.length > 0) {
    params.push(tickers);
    tickersParamIndex = params.length;
    clauses.push(`c.activo = any($${tickersParamIndex}::text[])`);
  }

  if (from) {
    params.push(from);
    clauses.push(`c.fecha >= $${params.length}`);
  } else {
    clauses.push("c.fecha >= current_date");
  }

  if (to) {
    params.push(to);
    clauses.push(`c.fecha <= $${params.length}`);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
  const orderByTickers =
    tickersParamIndex !== null
      ? `array_position($${tickersParamIndex}::text[], c.activo),`
      : "a.priority asc nulls last,";

  try {
    const result = await query<CashflowRow>(
      `
        select
          c.activo as ticker,
          c.fecha,
          c.valor_residual,
          c.interes,
          c.capital,
          c.cupon
        from rf_cashflows c
        left join rf_assets a on a.activo = c.activo
        ${where}
        order by ${orderByTickers} c.activo asc, c.fecha asc
      `,
      params
    );

    return jsonOk(groupCashflows(result.rows));
  } catch (error) {
    return jsonError("Failed to fetch cashflows", 500, serializeError(error));
  }
}
