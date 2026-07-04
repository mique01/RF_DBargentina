import { jsonOk } from "@/lib/responses";

export function GET() {
  return jsonOk({
    ok: true,
    service: "rf-api",
    timestamp: new Date().toISOString()
  });
}
