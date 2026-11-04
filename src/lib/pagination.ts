export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface Pagination {
  limit: number;
  offset: number;
}

export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

function toInt(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Reads `limit` (default 20, 1..100) and the position from a query string: either a
 * 1-based `page` (default 1) or an `offset` (default 0). `page` wins when both are given.
 */
export function parsePagination(query: Record<string, unknown>): Pagination {
  const limit = clamp(toInt(query.limit) ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
  const page = toInt(query.page);
  if (page !== undefined) {
    return { limit, offset: Math.max(page, 1) * limit };
  }
  const offset = Math.max(toInt(query.offset) ?? 0, 0);
  return { limit, offset };
}

/** Builds a page from rows fetched with `limit + 1`: the extra row only signals that more exist. */
export function toPage<T>(rows: T[], limit: number): Page<T> {
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}
