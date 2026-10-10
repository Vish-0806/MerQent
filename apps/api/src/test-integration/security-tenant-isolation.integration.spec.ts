import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';
import { Job } from 'bullmq';
import {
  UserRole,
  FileScanStatus,
  RealtimeEvent,
  ErrorCode,
  UserContext,
} from '@merqent/shared-types';
import { FilesService } from '../modules/files/files.service';
import { RealtimeGateway } from '../infrastructure/realtime/realtime.gateway';
import { FileQueueProcessor } from '../infrastructure/jobs/processors/file-queue.processor';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { RequestContextService } from '../common/context/request-context.service';
import {
  createTestFileRecord,
  createMockPrismaService,
  createMockRedisService,
  createMockStorageService,
  createMockMalwareScanner,
  createMockSocket,
} from '../test-utils';

describe('Cross-Module Integration: Security, RBAC & Multi-Tenant Isolation', () => {
  const firmOneId = 'f1111111-1111-1111-1111-111111111111';
  const firmTwoId = 'f2222222-2222-2222-2222-222222222222';

  const userFirmOne: UserContext = {
    id: 'u1111111-1111-1111-1111-111111111111',
    email: 'analyst@firmone.test',
    role: UserRole.PE_FIRM_MEMBER,
    firmId: firmOneId,
  };

  const userFirmTwo: UserContext = {
    id: 'u2222222-2222-2222-2222-222222222222',
    email: 'associate@firmtwo.test',
    role: UserRole.PE_FIRM_MEMBER,
    firmId: firmTwoId,
  };

  const platformAdmin: UserContext = {
    id: 'u9999999-9999-9999-9999-999999999999',
    email: 'admin@merqent.test',
    role: UserRole.PLATFORM_ADMIN,
    firmId: undefined,
  };

  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockRedis: ReturnType<typeof createMockRedisService>;
  let mockStorage: ReturnType<typeof createMockStorageService>;
  let mockScanner: ReturnType<typeof createMockMalwareScanner>;
  let filesService: FilesService;
  let realtimeGateway: RealtimeGateway;
  let fileQueueProcessor: FileQueueProcessor;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockRedis = createMockRedisService();
    mockStorage = createMockStorageService();
    mockScanner = createMockMalwareScanner(true);

    configService = {
      get: jest.fn().mockImplementation((key: string, def?: unknown) => {
        if (key === 'jwt.secret') return 'integration-jwt-secret-key-32-chars';
        return def;
      }),
    } as unknown as ConfigService;

    jwtService = new JwtService({ secret: 'integration-jwt-secret-key-32-chars' });

    filesService = new FilesService(
      mockPrisma as unknown as PrismaService,
      mockStorage,
      mockScanner,
      {
        getUser: jest.fn().mockReturnValue(userFirmOne),
        getCorrelationId: jest.fn().mockReturnValue('req-corr-int-001'),
      } as unknown as RequestContextService,
    );

    realtimeGateway = new RealtimeGateway(
      jwtService,
      configService,
      mockPrisma as unknown as PrismaService,
      mockRedis as unknown as RedisService,
    );
    realtimeGateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map(),
        adapter: { rooms: new Map() },
      },
    } as unknown as Server;

    fileQueueProcessor = new FileQueueProcessor(
      mockPrisma as unknown as PrismaService,
      mockStorage,
      mockScanner,
    );
  });

  describe('1. Storage & File Tenant Boundary Enforcement', () => {
    it('prevents Firm Two member from generating download URL for Firm One document', async () => {
      const fileFirmOne = {
        ...createTestFileRecord({
          id: 'file-001',
          firmId: firmOneId,
          uploadedById: userFirmOne.id,
          scanStatus: FileScanStatus.CLEAN,
        }),
        ownerUserId: userFirmOne.id,
      };

      mockPrisma.fileRecord.findUnique.mockResolvedValue(fileFirmOne);
      mockPrisma.firmMember.findUnique.mockResolvedValue(null);

      // Attempt to access Firm One file as User from Firm Two
      await expect(filesService.getDownloadUrl(userFirmTwo, 'file-001')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('prevents Firm Two member from deleting Firm One file record', async () => {
      const fileFirmOne = {
        ...createTestFileRecord({
          id: 'file-001',
          firmId: firmOneId,
          uploadedById: userFirmOne.id,
        }),
        ownerUserId: userFirmOne.id,
      };

      mockPrisma.fileRecord.findUnique.mockResolvedValue(fileFirmOne);
      mockPrisma.firmMember.findUnique.mockResolvedValue(null);

      await expect(filesService.deleteFile(userFirmTwo, 'file-001')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('2. Realtime WebSocket Tenant Room Boundary Enforcement', () => {
    it('denies Firm One member from subscribing to Firm Two realtime events', async () => {
      const socket = createMockSocket('sock-user-1');
      socket.data = {
        user: {
          id: userFirmOne.id,
          email: userFirmOne.email,
          role: userFirmOne.role,
          firmId: userFirmOne.firmId,
        },
      };

      // Attempt to join firmTwo room
      const result = realtimeGateway.handleJoinRoom(socket as unknown as Socket, {
        roomId: `firm:${firmTwoId}`,
      });

      expect(result).toBeUndefined();
      expect(socket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({
          code: ErrorCode.WS_ROOM_JOIN_DENIED,
        }),
      );
      expect(socket.join).not.toHaveBeenCalledWith(`firm:${firmTwoId}`);
    });

    it('permits PLATFORM_ADMIN to join arbitrary firm rooms for system audit', async () => {
      const adminSocket = createMockSocket('sock-admin-1');
      adminSocket.data = {
        user: {
          id: platformAdmin.id,
          email: platformAdmin.email,
          role: platformAdmin.role,
          firmId: undefined,
        },
      };

      const result = realtimeGateway.handleJoinRoom(adminSocket as unknown as Socket, {
        roomId: `firm:${firmTwoId}`,
      });

      expect(result).toEqual({
        event: RealtimeEvent.ROOM_JOINED,
        roomId: `firm:${firmTwoId}`,
      });
      expect(adminSocket.join).toHaveBeenCalledWith(`firm:${firmTwoId}`);
    });
  });

  describe('3. Cross-Module Token Revocation Propagation', () => {
    it('immediately disconnects active WebSocket session on token revocation during heartbeat', async () => {
      const validToken = 'revoked-test-jwt-token';
      const socket = createMockSocket('sock-user-1');
      socket.handshake.auth.token = validToken;
      socket.data = {
        token: validToken,
        user: {
          id: userFirmOne.id,
          email: userFirmOne.email,
          role: userFirmOne.role,
          firmId: userFirmOne.firmId,
        },
      };

      // Simulate token being blacklisted in Redis (e.g. from logout or password reset)
      await mockRedis.blacklistToken(validToken);

      // Gateway processes heartbeat from the connected client
      await realtimeGateway.handleHeartbeat(socket as unknown as Socket, {});

      expect(socket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({
          code: ErrorCode.WS_UNAUTHORIZED,
        }),
      );
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('4. Worker Ground-Truth Path Verification', () => {
    it('fails closed and rejects processing if job storageKey does not match database record', async () => {
      const validFileUuid = '44444444-4444-4444-4444-444444444444';
      const fileRecord = createTestFileRecord({
        id: validFileUuid,
        firmId: firmOneId,
        storageKey: `tenants/${firmOneId}/documents/${validFileUuid}/doc.pdf`,
      });
      mockPrisma.fileRecord.findUnique.mockResolvedValue(fileRecord);

      // Rogue payload attempting path mismatch
      const rogueJob = {
        name: 'malware-scan',
        data: {
          fileRecordId: validFileUuid,
          storageKey: `tenants/${firmTwoId}/documents/55555555-5555-5555-5555-555555555555/tampered.pdf`,
          tenantId: firmOneId,
        },
      } as unknown as Job;

      await expect(fileQueueProcessor.process(rogueJob)).rejects.toThrow(/storage key mismatch/i);
    });
  });
});
