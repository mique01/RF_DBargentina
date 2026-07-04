import { openApiSpec } from "@/lib/openapi";
import { jsonOk } from "@/lib/responses";

export function GET() {
  return jsonOk(openApiSpec);
}
