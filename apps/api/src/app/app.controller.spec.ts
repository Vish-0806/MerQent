import { AppController } from './app.controller';

describe('AppController Health Check (Task 2.2)', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController();
  });

  it('should return operational health status', () => {
    const result = appController.checkHealth();

    expect(result).toBeDefined();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('MerQent API');
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.uptime).toBe('number');
  });
});
