import { query } from "@/lib/db";
import { normalizeDate } from "@/lib/normalizers";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const clauses: string[] = [];
  const params: unknown[] = [];
  const from = normalizeDate(searchParams.get("from"));
  const to = normalizeDate(searchParams.get("to"));

  if (from) {
    params.push(from);
    clauses.push(`fecha >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    clauses.push(`fecha <= $${params.length}`);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";

  try {
    const result = await query(
      `
        select
          date_trunc('month', fecha)::date as month,
          sum(coalesce(capital, 0)) as total_capital,
          sum(coalesce(interes, 0)) as total_interes,
          sum(coalesce(cupon, 0)) as total_cupon,
          count(*)::int as cantidad_pagos
        from rf_cashflows
        ${where}
        group by 1
        order by 1 asc
      `,
      params
    );

    return jsonOk(result.rows);
  } catch (error) {
    return jsonError("Failed to fetch monthly calendar", 500, serializeError(error));
  }
}
