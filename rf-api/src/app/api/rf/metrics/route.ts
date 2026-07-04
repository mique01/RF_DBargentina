import { query } from "@/lib/db";
import { buildWhere } from "@/lib/queries";
import { parseTickers } from "@/lib/normalizers";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const tickers = parseTickers(searchParams.get("tickers"));
  const { clauses, params, nextIndex } = buildWhere(searchParams, [
    "estado",
    "tipo_data912",
    "subasset_class"
  ]);

  if (tickers.length > 0) {
    clauses.push(`activo = any($${nextIndex}::text[])`);
    params.push(tickers as unknown as string);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
  const orderBy =
    tickers.length > 0
      ? `order by array_position($${nextIndex}::text[], activo), activo asc`
      : "order by activo asc";

  try {
    const result = await query(
      `
        select *
        from rf_metrics_latest
        ${where}
        ${orderBy}
      `,
      params
    );

    return jsonOk(result.rows);
  } catch (error) {
    return jsonError("Failed to fetch metrics", 500, serializeError(error));
  }
}
