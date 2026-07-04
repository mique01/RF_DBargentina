import { query } from "@/lib/db";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ activo: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { activo } = await context.params;

  try {
    const assetResult = await query(
      "select * from rf_assets where activo = $1",
      [decodeURIComponent(activo)]
    );

    if (assetResult.rowCount === 0) {
      return jsonError("Asset not found", 404);
    }

    const metricsResult = await query(
      "select * from rf_metrics_latest where activo = $1",
      [decodeURIComponent(activo)]
    );

    const cashflowsSummary = await query(
      `
        select
          count(*)::int as total_cashflows,
          min(fecha) filter (where fecha >= current_date) as next_payment_date,
          max(fecha) filter (where fecha < current_date) as last_payment_date
        from rf_cashflows
        where activo = $1
      `,
      [decodeURIComponent(activo)]
    );

    return jsonOk({
      asset: assetResult.rows[0],
      metrics_latest: metricsResult.rows[0] ?? null,
      cashflows_summary: cashflowsSummary.rows[0]
    });
  } catch (error) {
    return jsonError("Failed to fetch asset", 500, serializeError(error));
  }
}
