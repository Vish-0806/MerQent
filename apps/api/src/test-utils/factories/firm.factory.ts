import { FirmAumTier } from '@merqent/shared-types';

export interface TestFirmEntity {
  id: string;
  name: string;
  slug: string;
  aumTier: FirmAumTier;
  createdAt: Date;
  updatedAt: Date;
}

let firmCounter = 1;

/**
 * Factory for creating deterministic Firm entities for tests.
 */
export function createTestFirm(overrides: Partial<TestFirmEntity> = {}): TestFirmEntity {
  const index = firmCounter++;
  return {
    id: `f0000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    name: `Test Firm Capital ${index}`,
    slug: `test-firm-capital-${index}`,
    aumTier: FirmAumTier.TIER_2B_TO_10B,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
