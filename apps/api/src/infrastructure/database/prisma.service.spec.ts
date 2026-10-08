import { PrismaService } from './prisma.service';

describe('PrismaService (Task 2.4)', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
    // Mock Prisma internal methods
    service.$connect = jest.fn().mockResolvedValue(undefined);
    service.$disconnect = jest.fn().mockResolvedValue(undefined);
    service.$queryRawUnsafe = jest.fn().mockResolvedValue([{ 1: 1 }]);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('attempts connection on module init', async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalledTimes(1);
  });

  it('closes connection on module destroy', async () => {
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('reports connected status with latency during healthy probe', async () => {
    const health = await service.checkHealth();

    expect(health.status).toBe('connected');
    expect(typeof health.latencyMs).toBe('number');
    expect(service.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports disconnected status when database query fails', async () => {
    (service.$queryRawUnsafe as jest.Mock).mockRejectedValueOnce(
      new Error('Connection terminated'),
    );

    const health = await service.checkHealth();

    expect(health.status).toBe('disconnected');
    expect(health.latencyMs).toBeUndefined();
  });
});
