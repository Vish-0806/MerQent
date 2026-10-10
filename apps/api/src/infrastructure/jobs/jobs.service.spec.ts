import { Test, TestingModule } from '@nestjs/testing';
import { Queue, Worker } from 'bullmq';
import { JobsService } from './jobs.service';
import { FileQueueProducer } from './producers/file-queue.producer';
import { FileQueueProcessor } from './processors/file-queue.processor';
import { AppConfigService } from '../../common/config/app-config.service';
import { FILE_PROCESSING_QUEUE } from './jobs.constants';

// Mock BullMQ Queue and Worker
jest.mock('bullmq');

describe('JobsService', () => {
  let service: JobsService;
  let mockProducer: Partial<FileQueueProducer>;
  let mockProcessor: Partial<FileQueueProcessor>;
  let mockConfigService: Partial<AppConfigService>;
  let mockQueueInstance: {
    close: jest.Mock;
    isPaused: jest.Mock;
    getJobCounts: jest.Mock;
  };
  let mockWorkerInstance: {
    on: jest.Mock;
    pause: jest.Mock;
    close: jest.Mock;
    isPaused: jest.Mock;
    isRunning: jest.Mock;
  };

  beforeEach(async () => {
    mockProducer = {
      setQueue: jest.fn(),
    };

    mockProcessor = {
      process: jest.fn(),
    };

    mockConfigService = {
      redisHost: '127.0.0.1',
      redisPort: 6379,
      redisConnectionOptions: {
        host: '127.0.0.1',
        port: 6379,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
    };

    mockQueueInstance = {
      close: jest.fn().mockResolvedValue(undefined),
      isPaused: jest.fn().mockResolvedValue(false),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 2,
        active: 1,
        failed: 0,
        completed: 10,
        delayed: 0,
      }),
    };

    mockWorkerInstance = {
      on: jest.fn().mockReturnThis(),
      pause: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      isPaused: jest.fn().mockReturnValue(false),
      isRunning: jest.fn().mockReturnValue(true),
    };

    (Queue as unknown as jest.Mock).mockImplementation(() => mockQueueInstance);
    (Worker as unknown as jest.Mock).mockImplementation(() => mockWorkerInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: FileQueueProducer, useValue: mockProducer },
        { provide: FileQueueProcessor, useValue: mockProcessor },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Lifecycle Management', () => {
    it('initializes queues and workers onModuleInit', async () => {
      await service.onModuleInit();

      expect(Queue).toHaveBeenCalledWith(
        FILE_PROCESSING_QUEUE,
        expect.objectContaining({
          connection: mockConfigService.redisConnectionOptions,
        }),
      );
      expect(mockProducer.setQueue).toHaveBeenCalledWith(mockQueueInstance);
      expect(Worker).toHaveBeenCalledWith(
        FILE_PROCESSING_QUEUE,
        expect.any(Function),
        expect.objectContaining({
          connection: mockConfigService.redisConnectionOptions,
          concurrency: 5,
        }),
      );
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('pauses workers during beforeApplicationShutdown', async () => {
      await service.onModuleInit();
      await service.beforeApplicationShutdown();

      expect(mockWorkerInstance.pause).toHaveBeenCalledWith(true);
    });

    it('gracefully closes workers and queues onModuleDestroy', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockWorkerInstance.close).toHaveBeenCalled();
      expect(mockQueueInstance.close).toHaveBeenCalled();
    });
  });

  describe('Health Checks', () => {
    it('returns healthy status when queue is responsive and no excessive failures', async () => {
      await service.onModuleInit();
      const health = await service.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.workerStatus).toBe('running');
      expect(health.queues[FILE_PROCESSING_QUEUE]).toEqual({
        isPaused: false,
        waiting: 2,
        active: 1,
        failed: 0,
      });
    });

    it('returns degraded status when failed jobs exceed threshold', async () => {
      mockQueueInstance.getJobCounts.mockResolvedValueOnce({
        waiting: 0,
        active: 0,
        failed: 25, // Above threshold of 20
        completed: 10,
        delayed: 0,
      });

      await service.onModuleInit();
      const health = await service.checkHealth();

      expect(health.status).toBe('degraded');
      expect(health.queues[FILE_PROCESSING_QUEUE]?.failed).toBe(25);
    });

    it('returns unhealthy status when queue probe throws connection error', async () => {
      mockQueueInstance.getJobCounts.mockRejectedValueOnce(new Error('Redis connection lost'));

      await service.onModuleInit();
      const health = await service.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.workerStatus).toBe('stopped');
    });
  });

  describe('Queue and Worker Accessors', () => {
    it('returns queue and worker by name after init', async () => {
      await service.onModuleInit();

      expect(service.getQueue(FILE_PROCESSING_QUEUE)).toBe(mockQueueInstance);
      expect(service.getWorker(FILE_PROCESSING_QUEUE)).toBe(mockWorkerInstance);
      expect(service.getQueue('non-existent')).toBeUndefined();
    });
  });
});
