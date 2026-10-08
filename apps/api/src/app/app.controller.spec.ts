import { AppController } from './app.controller';
import { PrismaService } from '../infrastructure/database/prisma.service';

describe('AppController Health Check (Task 2.4)', () => {
  let appController: AppController;
  let mockPrisma: Partial<PrismaService>;

  beforeEach(() => {
    mockPrisma = {
      checkHealth: jest.fn().mockResolvedValue({
        status: 'connected',
        latencyMs: 2,
      }),
    };
    appController = new AppController(mockPrisma as PrismaService);
  });

  it('should return operational health status when database is connected', async () => {
    const result = await appController.checkHealth();

    expect(result).toBeDefined();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('MerQent API');
    expect(result.version).toBe('1.0.0');
    expect(result.dependencies.database.status).toBe('connected');
    expect(result.dependencies.database.latencyMs).toBe(2);
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.uptime).toBe('number');
  });

  it('should return degraded health status when database is disconnected', async () => {
    (mockPrisma.checkHealth as jest.Mock).mockResolvedValueOnce({
      status: 'disconnected',
    });

    const result = await appController.checkHealth();

    expect(result).toBeDefined();
    expect(result.status).toBe('degraded');
    expect(result.dependencies.database.status).toBe('disconnected');
  });
});
