import { MetricsService } from './metrics.service';

describe('MetricsService (Task 2.12)', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
  });

  describe('Route Normalization & Cardinality Protection', () => {
    it('should normalize UUIDs and numeric IDs to avoid metric cardinality explosion', () => {
      const rawPath1 = '/api/v1/projects/c2d7658c-4a37-4d92-bf3e-8f5370d02b54/shortlists';
      const rawPath2 = '/api/v1/users/42/profile';
      const rawPath3 = '/api/v1/auth/session/99887766/status?filter=active&sort=desc';

      expect(metricsService.normalizeRoute(rawPath1)).toBe('/api/v1/projects/:id/shortlists');
      expect(metricsService.normalizeRoute(rawPath2)).toBe('/api/v1/users/:id/profile');
      expect(metricsService.normalizeRoute(rawPath3)).toBe('/api/v1/auth/session/:id/status');
    });

    it('should handle root and empty paths safely', () => {
      expect(metricsService.normalizeRoute('/')).toBe('/');
      expect(metricsService.normalizeRoute('')).toBe('/');
    });
  });

  describe('HTTP Request Telemetry & Error Tracking', () => {
    it('should track in-flight requests', () => {
      expect(metricsService.getInFlightRequests()).toBe(0);
      metricsService.incrementInFlight();
      metricsService.incrementInFlight();
      expect(metricsService.getInFlightRequests()).toBe(2);
      metricsService.decrementInFlight();
      expect(metricsService.getInFlightRequests()).toBe(1);
    });

    it('should accurately calculate request counts, error rates, and percentiles', () => {
      // Simulate 10 successful requests with various latencies
      for (let i = 1; i <= 8; i++) {
        metricsService.recordHttpRequest('GET', '/api/v1/health', 200, i * 10);
      }
      // Simulate 1 client error (400) and 1 server error (500)
      metricsService.recordHttpRequest('POST', '/api/v1/auth/login', 400, 50);
      metricsService.recordHttpError('POST', '/api/v1/auth/login', 400, 'VALIDATION_ERROR');

      metricsService.recordHttpRequest('GET', '/api/v1/projects/123', 500, 200);
      metricsService.recordHttpError('GET', '/api/v1/projects/123', 500, 'INTERNAL_SERVER_ERROR');

      const snapshot = metricsService.getMetricsSnapshot();

      expect(snapshot.requests.total).toBe(10);
      expect(snapshot.requests.byMethod['GET']).toBe(9);
      expect(snapshot.requests.byMethod['POST']).toBe(1);
      expect(snapshot.requests.byStatus['2xx']).toBe(8);
      expect(snapshot.requests.byStatus['4xx']).toBe(1);
      expect(snapshot.requests.byStatus['5xx']).toBe(1);

      expect(snapshot.errors.total).toBe(2);
      expect(snapshot.errors.clientErrors).toBe(1);
      expect(snapshot.errors.serverErrors).toBe(1);
      expect(snapshot.errors.errorRatePercent).toBe(20); // 2/10 = 20%

      expect(snapshot.latencyMs.min).toBe(10);
      expect(snapshot.latencyMs.max).toBe(200);
      expect(snapshot.latencyMs.avg).toBeGreaterThan(0);
      expect(snapshot.latencyMs.p50).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Dependency Health Gauges & Prometheus Export', () => {
    it('should record dependency statuses and latencies', () => {
      metricsService.recordDependencyHealth('database', true, 3);
      metricsService.recordDependencyHealth('redis', true, 1);
      metricsService.recordDependencyHealth('storage', false);

      const snapshot = metricsService.getMetricsSnapshot();
      expect(snapshot.dependencies['database']?.healthy).toBe(true);
      expect(snapshot.dependencies['database']?.latencyMs).toBe(3);
      expect(snapshot.dependencies['redis']?.healthy).toBe(true);
      expect(snapshot.dependencies['storage']?.healthy).toBe(false);
    });

    it('should export valid Prometheus exposition format', () => {
      metricsService.recordHttpRequest('GET', '/api/v1/health', 200, 15);
      metricsService.recordDependencyHealth('database', true, 2);

      const prom = metricsService.getPrometheusFormat();

      expect(prom).toContain('# HELP http_requests_total');
      expect(prom).toContain('# TYPE http_requests_total counter');
      expect(prom).toContain('http_requests_total{method="GET"} 1');

      expect(prom).toContain('# HELP http_request_duration_ms_histogram');
      expect(prom).toContain('http_request_duration_ms_histogram_count 1');

      expect(prom).toContain('# HELP dependency_status');
      expect(prom).toContain('dependency_status{name="database"} 1');

      expect(prom).toContain('# HELP process_uptime_seconds');
      expect(prom).toContain('# HELP process_memory_heap_used_bytes');
    });
  });
});
