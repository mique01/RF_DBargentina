import { query } from "@/lib/db";
import { normalizeDate } from "@/lib/normalizers";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const clauses: string[] = [];
  const params: unknown[] = [];

  const activo = searchParams.get("activo");
  const from = normalizeDate(searchParams.get("from"));
  const to = normalizeDate(searchParams.get("to"));
  const onlyFuture = searchParams.get("only_future") === "true";

  if (activo) {
    params.push(activo);
    clauses.push(`activo = $${params.length}`);
  }

  if (from) {
    params.push(from);
    clauses.push(`fecha >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    clauses.push(`fecha <= $${params.length}`);
  }

  if (onlyFuture) {
    clauses.push("fecha >= current_date");
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";

  try {
    const result = await query(
      `
        select
          activo,
          fecha,
          valor_residual,
          interes,
          capital,
          cupon,
          source_updated_at,
          updated_at
        from rf_cashflows
        ${where}
        order by fecha asc, activo asc
      `,
      params
    );

    return jsonOk(result.rows);
  } catch (error) {
    return jsonError("Failed to fetch cashflows", 500, serializeError(error));
  }
}
