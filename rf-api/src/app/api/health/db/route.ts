import { query } from "@/lib/db";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await query<{ now: Date }>("select now()");

    return jsonOk({
      ok: true,
      service: "rf-api",
      database: "ok",
      now: result.rows[0]?.now,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonError("Database connection failed", 500, serializeError(error));
  }
}
