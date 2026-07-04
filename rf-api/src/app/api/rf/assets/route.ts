import { query } from "@/lib/db";
import { buildWhere } from "@/lib/queries";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const { where, params } = buildWhere(searchParams, [
    "tipo_data912",
    "status",
    "source"
  ]);

  try {
    const result = await query(
      `
        select
          activo,
          ticker,
          tipo_data912,
          subasset_class,
          status,
          source,
          nominal_units,
          total_cashflow_records,
          source_updated_at,
          updated_at
        from rf_assets
        ${where}
        order by activo asc
      `,
      params
    );

    return jsonOk(result.rows);
  } catch (error) {
    return jsonError("Failed to fetch assets", 500, serializeError(error));
  }
}
