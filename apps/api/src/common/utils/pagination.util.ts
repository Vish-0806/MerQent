import { PaginationParams } from '@merqent/shared-types';

export interface DatabasePagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/**
 * Normalizes user pagination inputs into safe, bounded database skip/take offsets.
 */
export function calculatePaginationOffsets(
  params?: PaginationParams,
  defaultLimit = 20,
  maxLimit = 100,
): DatabasePagination {
  const page = Math.max(1, Number(params?.page) || 1);
  const rawLimit = params?.limit !== undefined ? Number(params.limit) : defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, isNaN(rawLimit) ? defaultLimit : rawLimit));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
}
