import type { NextRequest } from "next/server";
import { isImportAuthorized } from "@/lib/auth";
import { withClient } from "@/lib/db";
import { normalizeMetricsPayload, normalizeString } from "@/lib/normalizers";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";
import { upsertAsset, upsertMetricLatest, type ImportError } from "@/lib/queries";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isImportAuthorized(req)) {
    return jsonError("Unauthorized", 401);
  }

  let metrics;

  try {
    metrics = normalizeMetricsPayload(await req.json());
  } catch (error) {
    return jsonError(serializeError(error), 400);
  }

  const errors: ImportError[] = [];
  let processed = 0;

  await withClient(async (client) => {
    for (const [index, metric] of metrics.entries()) {
      const activo = normalizeString(metric.activo);

      if (!activo) {
        errors.push({ error: "Missing activo" });
        continue;
      }

      try {
        await client.query("begin");
        await upsertAsset(client, {
          activo,
          ticker: activo,
          tipo_data912: metric.tipo_data912,
          subasset_class: metric.subasset_class,
          priority: index + 1,
          nominal_units: metric.nominal_units,
          source_updated_at: metric.updated_at
        });
        await upsertMetricLatest(client, {
          ...metric,
          priority: index + 1
        });
        await client.query("commit");
        processed += 1;
      } catch (error) {
        await client.query("rollback");
        errors.push({ activo, error: serializeError(error) });
      }
    }
  });

  return jsonOk({
    ok: true,
    processed,
    errors
  });
}
