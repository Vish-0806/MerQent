import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface MockModelDelegate {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
}

export interface MockPrismaService {
  user: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  firm: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  firmMember: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
  };
  file: MockModelDelegate;
  fileRecord: MockModelDelegate;
  refreshToken: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  taxonomyTerm: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
  checkHealth: jest.Mock;
  $queryRawUnsafe: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $transaction: jest.Mock;
}

export type MockedPrismaService = Omit<
  PrismaService,
  'fileRecord' | 'file' | 'user' | 'firm' | 'firmMember' | 'refreshToken' | 'taxonomyTerm'
> &
  MockPrismaService;

/**
 * Creates a fully-mocked, reset-safe PrismaService for unit and integration testing.
 */
export function createMockPrismaService(): MockedPrismaService {
  const mock: Record<string, unknown> = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    firm: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    firmMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    file: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    fileRecord: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    taxonomyTerm: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    checkHealth: jest.fn().mockResolvedValue({
      status: 'connected',
      latencyMs: 1,
    }),
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ '1': 1 }]),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation((cb: (prisma: unknown) => unknown) => {
      if (typeof cb === 'function') return cb(mock);
      return Promise.all(cb as unknown as Promise<unknown>[]);
    }),
  };

  return mock as unknown as MockPrismaService & PrismaService;
}
