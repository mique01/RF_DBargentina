export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export function normalizeMetricsPayload(body: unknown): JsonRecord[] {
  if (Array.isArray(body)) {
    return body.filter((item): item is JsonRecord => asRecord(item) !== null);
  }

  const record = asRecord(body);

  if (!record) {
    throw new Error("Invalid payload: expected array, metrics array, or data array");
  }

  if (Array.isArray(record.metrics)) {
    return record.metrics.filter((item): item is JsonRecord => asRecord(item) !== null);
  }

  if (Array.isArray(record.data)) {
    return record.data.filter((item): item is JsonRecord => asRecord(item) !== null);
  }

  throw new Error("Invalid payload: expected array, metrics array, or data array");
}

export function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeInteger(value: unknown): number | null {
  const numberValue = normalizeNumber(value);
  return numberValue === null ? null : Math.trunc(numberValue);
}

export function normalizeDate(value: unknown): string | null {
  const text = normalizeString(value);

  if (!text) {
    return null;
  }

  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

export function normalizeTimestamp(value: unknown): string | null {
  const text = normalizeString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseTickers(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((ticker) => ticker.trim())
    .filter(Boolean);
}

export function parseLimit(value: string | null, defaultLimit: number, maxLimit: number) {
  const parsed = value ? Number(value) : defaultLimit;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(Math.trunc(parsed), maxLimit);
}
