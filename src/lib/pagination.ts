import { Prisma } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ── Parse pagination params from URL ─────────────────────────────────

export function parsePagination(searchParams: URLSearchParams, defaults = { limit: 25, maxLimit: 100 }): Required<PaginationParams> & { cursor?: string } {
  const rawPage = searchParams.get('page');
  const rawLimit = searchParams.get('limit');
  const cursor = searchParams.get('cursor') || undefined;

  const limit = Math.min(
    Math.max(parseInt(rawLimit || String(defaults.limit), 10) || defaults.limit, 1),
    defaults.maxLimit,
  );

  const page = cursor ? 1 : Math.max(parseInt(rawPage || '1', 10) || 1, 1);

  return { page, limit, cursor };
}

// ── Build Prisma offset/take from page/limit ─────────────────────────

export function prismaPagination(params: Required<PaginationParams>) {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit + 1, // +1 to detect hasNext
  };
}

// ── Build Prisma cursor pagination ───────────────────────────────────

export function prismaCursorPagination(params: { cursor?: string; limit: number }, orderByField: string) {
  if (!params.cursor) {
    return { take: params.limit + 1 };
  }

  return {
    skip: 1,
    cursor: { id: params.cursor },
    take: params.limit + 1,
  };
}

// ── Format paginated response (offset-based) ─────────────────────────

export function paginateResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const pages = Math.ceil(total / limit);
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

// ── Format paginated response (cursor-based) ─────────────────────────

export function paginateCursorResult<T>(
  items: T[],
  limit: number,
  cursor?: string,
): Omit<PaginatedResult<T>, 'pagination'> & {
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
} {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  return {
    data,
    pagination: {
      nextCursor: hasMore ? data[data.length - 1]?.id || null : null,
      prevCursor: cursor || null,
      hasMore,
      limit,
    },
  };
}

// ── Helper: run findMany + count in parallel ─────────────────────────

export async function paginatedFindMany<T>(
  model: {
    findMany: (args: Prisma.FindManyArgs) => Promise<T[]>;
    count: (args?: Prisma.FindManyArgs) => Promise<number>;
  },
  where: Prisma.FindManyArgs['where'],
  orderBy: Prisma.FindManyArgs['orderBy'],
  page: number,
  limit: number,
  include?: Prisma.FindManyArgs['include'],
  select?: Prisma.FindManyArgs['select'],
): Promise<PaginatedResult<T>> {
  const [data, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),
    model.count({ where }),
  ]);

  return paginateResult(data, total, page, limit);
}