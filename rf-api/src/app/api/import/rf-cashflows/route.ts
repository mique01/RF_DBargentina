import type { NextRequest } from "next/server";
import { isImportAuthorized } from "@/lib/auth";
import { withClient } from "@/lib/db";
import {
  asRecord,
  normalizeString,
  normalizeTimestamp,
  type JsonRecord
} from "@/lib/normalizers";
import { jsonError, jsonOk, serializeError } from "@/lib/responses";
import { upsertAsset, upsertCashflow, type ImportError } from "@/lib/queries";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isImportAuthorized(req)) {
    return jsonError("Unauthorized", 401);
  }

  const body = asRecord(await req.json().catch(() => null));

  if (!body || !asRecord(body.instruments)) {
    return jsonError("Invalid payload: expected instruments object", 400);
  }

  const syncMode = normalizeString(body.sync_mode);
  const instruments = asRecord(body.instruments) as Record<string, unknown>;
  const errors: ImportError[] = [];
  let assetsProcessed = 0;
  let cashflowsProcessed = 0;

  await withClient(async (client) => {
    for (const [key, value] of Object.entries(instruments)) {
      const instrument = asRecord(value);
      const activo =
        normalizeString(instrument?.activo) ??
        normalizeString(instrument?.ticker) ??
        normalizeString(key);

      if (!instrument || !activo) {
        errors.push({ item: key, error: "Invalid instrument" });
        continue;
      }

      try {
        await client.query("begin");

        const metadata = asRecord(instrument.metadata);
        const cashflows = Array.isArray(instrument.cashflows)
          ? instrument.cashflows
          : [];
        const source = normalizeString(instrument.source);
        const sourceUpdatedAt = normalizeTimestamp(instrument.updated_at);
        const importedDates: string[] = [];

        await upsertAsset(client, {
          activo,
          ticker: instrument.ticker ?? activo,
          tipo_data912: instrument.tipo_data912,
          subasset_class: metadata?.subasset_class,
          status: instrument.status,
          source,
          nominal_units: instrument.nominal_units ?? metadata?.nominal_units,
          total_cashflow_records:
            metadata?.total_records ?? cashflows.length,
          metadata,
          source_updated_at: sourceUpdatedAt
        });

        for (const cashflowValue of cashflows) {
          const cashflow = asRecord(cashflowValue);

          if (!cashflow) {
            errors.push({ activo, error: "Invalid cashflow" });
            continue;
          }

          try {
            const fecha = await upsertCashflow(
              client,
              activo,
              cashflow as JsonRecord,
              source,
              sourceUpdatedAt
            );
            importedDates.push(fecha);
            cashflowsProcessed += 1;
          } catch (error) {
            errors.push({ activo, error: serializeError(error) });
          }
        }

        if (syncMode === "full_by_asset") {
          if (importedDates.length > 0) {
            await client.query(
              "delete from rf_cashflows where activo = $1 and not (fecha = any($2::date[]))",
              [activo, importedDates]
            );
          } else {
            await client.query("delete from rf_cashflows where activo = $1", [
              activo
            ]);
          }
        }

        await client.query("commit");
        assetsProcessed += 1;
      } catch (error) {
        await client.query("rollback");
        errors.push({ activo, error: serializeError(error) });
      }
    }
  });

  return jsonOk({
    ok: true,
    assets_processed: assetsProcessed,
    cashflows_processed: cashflowsProcessed,
    errors
  });
}
