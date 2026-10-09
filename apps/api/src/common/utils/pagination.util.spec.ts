import { calculatePaginationOffsets } from './pagination.util';

describe('PaginationUtil (Task 2.11: Common Infrastructure)', () => {
  it('uses default values when no params are provided', () => {
    const result = calculatePaginationOffsets();

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('correctly calculates skip for page 3 with limit 15', () => {
    const result = calculatePaginationOffsets({ page: 3, limit: 15 });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(15);
    expect(result.skip).toBe(30);
    expect(result.take).toBe(15);
  });

  it('clamps invalid and excessive page/limit values safely', () => {
    const clampedUnderflow = calculatePaginationOffsets({ page: -5, limit: 0 });
    expect(clampedUnderflow.page).toBe(1);
    expect(clampedUnderflow.limit).toBe(1);
    expect(clampedUnderflow.skip).toBe(0);

    const clampedOverflow = calculatePaginationOffsets({ page: 2, limit: 500 }, 20, 100);
    expect(clampedOverflow.page).toBe(2);
    expect(clampedOverflow.limit).toBe(100);
    expect(clampedOverflow.skip).toBe(100);
    expect(clampedOverflow.take).toBe(100);
  });
});
