import { NextResponse } from "next/server";

export function jsonOk<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { ok: false, error } : { ok: false, error, details },
    { status }
  );
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
