import { UserRole, UserStatus } from '@merqent/shared-types';
import type { RequestUserContext } from '../../common/context/request-context.service';

export interface TestUserEntity {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  firmMember?: {
    firmId: string;
    role: string;
  } | null;
}

let userCounter = 1;

/**
 * Factory for creating deterministic User entities for unit and integration tests.
 */
export function createTestUser(overrides: Partial<TestUserEntity> = {}): TestUserEntity {
  const index = userCounter++;
  const defaultRole = overrides.role ?? UserRole.PE_FIRM_MEMBER;
  const firmId =
    overrides.firmMember?.firmId ?? `f0000000-0000-0000-0000-${String(index).padStart(12, '0')}`;

  return {
    id: `u0000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    email: `test.user.${index}@merqent.test`,
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$mockHashValueForTestingOnly$',
    fullName: `Test User ${index}`,
    role: defaultRole,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    firmMember: defaultRole === UserRole.CONSULTANT_OPERATOR ? null : { firmId, role: 'MEMBER' },
    ...overrides,
  };
}

/**
 * Factory for creating RequestUserContext objects used by RequestContextService and guards.
 */
export function createTestUserContext(
  overrides: Partial<RequestUserContext> = {},
): RequestUserContext {
  const index = userCounter++;
  return {
    id: `u0000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    email: `operator.${index}@merqent.test`,
    role: UserRole.PE_FIRM_MEMBER,
    firmId: `f0000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    ...overrides,
  };
}
