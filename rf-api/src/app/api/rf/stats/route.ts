import { query } from "@/lib/db";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await query(
      `
        select
          (select count(*)::int from rf_assets) as assets_count,
          (select count(*)::int from rf_metrics_latest) as metrics_latest_count,
          (select count(*)::int from rf_cashflows) as cashflows_count,
          (select max(updated_at) from rf_metrics_latest) as metrics_last_updated_at,
          (select max(updated_at) from rf_cashflows) as cashflows_last_updated_at
      `
    );

    return jsonOk(result.rows[0]);
  } catch (error) {
    return jsonError("Failed to fetch stats", 500, serializeError(error));
  }
}
