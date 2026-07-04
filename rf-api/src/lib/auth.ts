import type { NextRequest } from "next/server";

export function isImportAuthorized(req: NextRequest) {
  const secret = process.env.IMPORT_SECRET;
  const authorization = req.headers.get("authorization");

  return Boolean(secret) && authorization === `Bearer ${secret}`;
}
