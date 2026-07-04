import { query } from "@/lib/db";
import { parseLimit, parseTickers } from "@/lib/normalizers";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const tickers = parseTickers(searchParams.get("tickers"));
  const limit = parseLimit(searchParams.get("limit"), 50, 500);
  const params: unknown[] = [];
  const clauses = ["c.fecha >= current_date"];

  if (tickers.length > 0) {
    params.push(tickers);
    clauses.push(`c.activo = any($${params.length}::text[])`);
  }

  params.push(limit);

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
        where ${clauses.join(" and ")}
        order by c.fecha asc, c.activo asc
        limit $${params.length}
      `,
      params
    );

    return jsonOk(result.rows);
  } catch (error) {
    return jsonError("Failed to fetch upcoming payments", 500, serializeError(error));
  }
}
