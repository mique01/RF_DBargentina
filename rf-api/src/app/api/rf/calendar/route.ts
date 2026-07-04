import { query } from "@/lib/db";
import { normalizeDate, parseTickers } from "@/lib/normalizers";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const clauses: string[] = [];
  const params: unknown[] = [];

  const from = normalizeDate(searchParams.get("from"));
  const to = normalizeDate(searchParams.get("to"));
  const tipoData912 = searchParams.get("tipo_data912");
  const subassetClass = searchParams.get("subasset_class");
  const tickers = parseTickers(searchParams.get("tickers"));

  if (from) {
    params.push(from);
    clauses.push(`c.fecha >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    clauses.push(`c.fecha <= $${params.length}`);
  }

  if (tipoData912) {
    params.push(tipoData912);
    clauses.push(`a.tipo_data912 = $${params.length}`);
  }

  if (subassetClass) {
    params.push(subassetClass);
    clauses.push(`a.subasset_class = $${params.length}`);
  }

  if (tickers.length > 0) {
    params.push(tickers);
    clauses.push(`c.activo = any($${params.length}::text[])`);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";

  try {
    const result = await query(
      `
        select
          c.activo,
          c.fecha,
          c.capital,
          c.interes,
          c.cupon,
          c.valor_residual,
          a.tipo_data912,
          a.subasset_class,
          a.nominal_units
        from rf_cashflows c
        left join rf_assets a on a.activo = c.activo
        ${where}
        order by c.fecha asc, c.activo asc
      `,
      params
    );

    return jsonOk(result.rows);
  } catch (error) {
    return jsonError("Failed to fetch calendar", 500, serializeError(error));
  }
}
