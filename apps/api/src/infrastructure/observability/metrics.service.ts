import { Injectable } from '@nestjs/common';
import { MetricsSnapshot } from '@merqent/shared-types';

export interface RouteMetricsBucket {
  count: number;
  totalDurationMs: number;
}

export interface DependencyMetricRecord {
  healthy: boolean;
  latencyMs?: number;
  lastChecked: string;
}

/**
 * High-performance, lightweight in-memory application metrics registry.
 * Captures request counts, latency distributions, error rates, dependency health,
 * and process memory with zero external dependencies and cardinality protection.
 */
@Injectable()
export class MetricsService {
  private inFlightRequests = 0;
  private totalRequests = 0;
  private clientErrorsTotal = 0;
  private serverErrorsTotal = 0;

  private readonly requestsByMethod = new Map<string, number>();
  private readonly requestsByStatus = new Map<string, number>();
  private readonly requestsByRoute = new Map<string, number>();
  private readonly errorsByCode = new Map<string, number>();

  // Latency samples with circular buffer for percentile computation (max 1000 samples)
  private readonly latencySamples: number[] = [];
  private readonly maxLatencySamples = 1000;
  private totalDurationMs = 0;
  private minLatencyMs = Number.MAX_SAFE_INTEGER;
  private maxLatencyMs = 0;

  // Prometheus latency buckets in milliseconds
  private readonly latencyBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  private readonly latencyBucketCounts = new Map<number, number>();

  // Dependency health gauges
  private readonly dependencies = new Map<string, DependencyMetricRecord>();

  constructor() {
    this.reset();
  }

  /**
   * Resets all metric counters and gauges (used for test isolation).
   */
  reset(): void {
    this.inFlightRequests = 0;
    this.totalRequests = 0;
    this.clientErrorsTotal = 0;
    this.serverErrorsTotal = 0;
    this.requestsByMethod.clear();
    this.requestsByStatus.clear();
    this.requestsByRoute.clear();
    this.errorsByCode.clear();
    this.latencySamples.length = 0;
    this.totalDurationMs = 0;
    this.minLatencyMs = Number.MAX_SAFE_INTEGER;
    this.maxLatencyMs = 0;
    this.latencyBucketCounts.clear();
    for (const bucket of this.latencyBuckets) {
      this.latencyBucketCounts.set(bucket, 0);
    }
  }

  /**
   * Normalize an incoming HTTP path to prevent high-cardinality metric labels
   * and protect sensitive or dynamic identifiers (UUIDs, tokens, numeric IDs).
   */
  normalizeRoute(rawPath: string): string {
    if (!rawPath || rawPath === '/') return '/';

    // Strip query parameters
    let path = rawPath.split('?')[0] || '/';

    // Remove trailing slash if length > 1
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Replace UUIDs with :id parameter placeholder
    path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');

    // Replace numeric IDs with :id placeholder
    path = path.replace(/\/\d+(?=\/|$)/g, '/:id');

    // Replace known token patterns or hashes
    path = path.replace(/\/(token|secret|session)\/[^/]+/gi, '/$1/:id');

    return path;
  }

  incrementInFlight(): void {
    this.inFlightRequests++;
  }

  decrementInFlight(): void {
    if (this.inFlightRequests > 0) {
      this.inFlightRequests--;
    }
  }

  getInFlightRequests(): number {
    return this.inFlightRequests;
  }

  /**
   * Record a completed HTTP request with status and execution duration.
   */
  recordHttpRequest(
    method: string,
    rawRoute: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const normMethod = (method || 'GET').toUpperCase();
    const route = this.normalizeRoute(rawRoute);
    const statusKey = `${Math.floor(statusCode / 100)}xx`;
    const exactStatus = String(statusCode);

    this.totalRequests++;

    // Increment method counts
    this.requestsByMethod.set(normMethod, (this.requestsByMethod.get(normMethod) || 0) + 1);

    // Increment status class and exact status counts
    this.requestsByStatus.set(statusKey, (this.requestsByStatus.get(statusKey) || 0) + 1);
    this.requestsByStatus.set(exactStatus, (this.requestsByStatus.get(exactStatus) || 0) + 1);

    // Increment route count
    const routeKey = `${normMethod} ${route}`;
    this.requestsByRoute.set(routeKey, (this.requestsByRoute.get(routeKey) || 0) + 1);

    // Record error classifications
    if (statusCode >= 400 && statusCode < 500) {
      this.clientErrorsTotal++;
    } else if (statusCode >= 500) {
      this.serverErrorsTotal++;
    }

    // Track latency
    this.recordLatency(durationMs);
  }

  private recordLatency(durationMs: number): void {
    const dur = Math.max(0, durationMs);
    this.totalDurationMs += dur;

    if (dur < this.minLatencyMs) {
      this.minLatencyMs = dur;
    }
    if (dur > this.maxLatencyMs) {
      this.maxLatencyMs = dur;
    }

    // Circular buffer for percentile calculation
    if (this.latencySamples.length >= this.maxLatencySamples) {
      this.latencySamples.shift();
    }
    this.latencySamples.push(dur);

    // Update histogram buckets
    for (const bucket of this.latencyBuckets) {
      if (dur <= bucket) {
        this.latencyBucketCounts.set(bucket, (this.latencyBucketCounts.get(bucket) || 0) + 1);
      }
    }
  }

  /**
   * Record a typed HTTP error with error code.
   */
  recordHttpError(
    _method: string,
    _rawRoute: string,
    _statusCode: number,
    errorCode?: string,
  ): void {
    if (errorCode) {
      this.errorsByCode.set(errorCode, (this.errorsByCode.get(errorCode) || 0) + 1);
    }
  }

  /**
   * Record dependency health status and latency.
   */
  recordDependencyHealth(dependency: string, isHealthy: boolean, latencyMs?: number): void {
    this.dependencies.set(dependency, {
      healthy: isHealthy,
      latencyMs,
      lastChecked: new Date().toISOString(),
    });
  }

  /**
   * Computes a specific percentile from recorded latency samples.
   */
  getPercentile(p: number): number {
    if (this.latencySamples.length === 0) return 0;
    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const index = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return Math.round((sorted[index] ?? 0) * 100) / 100;
  }

  /**
   * Generates a structured snapshot of current application metrics.
   */
  getMetricsSnapshot(): MetricsSnapshot {
    const avgLatency =
      this.totalRequests > 0
        ? Math.round((this.totalDurationMs / this.totalRequests) * 100) / 100
        : 0;
    const minLatency = this.totalRequests > 0 ? this.minLatencyMs : 0;
    const maxLatency = this.totalRequests > 0 ? this.maxLatencyMs : 0;

    const totalErrors = this.clientErrorsTotal + this.serverErrorsTotal;
    const errorRatePercent =
      this.totalRequests > 0 ? Math.round((totalErrors / this.totalRequests) * 10000) / 100 : 0;

    const mem = process.memoryUsage();

    const byMethod: Record<string, number> = {};
    for (const [k, v] of this.requestsByMethod.entries()) {
      byMethod[k] = v;
    }

    const byStatus: Record<string, number> = {};
    for (const [k, v] of this.requestsByStatus.entries()) {
      byStatus[k] = v;
    }

    const deps: Record<string, { healthy: boolean; latencyMs?: number }> = {};
    for (const [k, v] of this.dependencies.entries()) {
      deps[k] = { healthy: v.healthy, latencyMs: v.latencyMs };
    }

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      requests: {
        total: this.totalRequests,
        inFlight: this.inFlightRequests,
        byMethod,
        byStatus,
      },
      latencyMs: {
        avg: avgLatency,
        min: minLatency,
        max: maxLatency,
        p50: this.getPercentile(50),
        p90: this.getPercentile(90),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
      },
      errors: {
        total: totalErrors,
        clientErrors: this.clientErrorsTotal,
        serverErrors: this.serverErrorsTotal,
        errorRatePercent,
      },
      memoryBytes: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
      },
      dependencies: deps,
    };
  }

  /**
   * Exports metrics in standard Prometheus / OpenMetrics text exposition format.
   */
  getPrometheusFormat(): string {
    const lines: string[] = [];

    // Header
    lines.push('# HELP http_requests_total Total number of HTTP requests processed');
    lines.push('# TYPE http_requests_total counter');
    if (this.requestsByMethod.size === 0) {
      lines.push('http_requests_total{method="ALL"} 0');
    } else {
      for (const [method, count] of this.requestsByMethod.entries()) {
        lines.push(`http_requests_total{method="${method}"} ${count}`);
      }
    }

    lines.push('# HELP http_requests_in_flight Current in-flight HTTP requests');
    lines.push('# TYPE http_requests_in_flight gauge');
    lines.push(`http_requests_in_flight ${this.inFlightRequests}`);

    lines.push('# HELP http_request_duration_ms_histogram HTTP request latency distribution in ms');
    lines.push('# TYPE http_request_duration_ms_histogram histogram');
    for (const bucket of this.latencyBuckets) {
      const count = this.latencyBucketCounts.get(bucket) || 0;
      lines.push(`http_request_duration_ms_histogram_bucket{le="${bucket}"} ${count}`);
    }
    lines.push(`http_request_duration_ms_histogram_bucket{le="+Inf"} ${this.totalRequests}`);
    lines.push(`http_request_duration_ms_histogram_sum ${this.totalDurationMs}`);
    lines.push(`http_request_duration_ms_histogram_count ${this.totalRequests}`);

    lines.push('# HELP http_errors_total Total number of HTTP error responses');
    lines.push('# TYPE http_errors_total counter');
    lines.push(`http_errors_total{class="4xx"} ${this.clientErrorsTotal}`);
    lines.push(`http_errors_total{class="5xx"} ${this.serverErrorsTotal}`);

    for (const [code, count] of this.errorsByCode.entries()) {
      lines.push(`http_errors_total{error_code="${code}"} ${count}`);
    }

    lines.push(
      '# HELP dependency_status Dependency operational readiness (1=healthy, 0=unhealthy)',
    );
    lines.push('# TYPE dependency_status gauge');
    for (const [dep, record] of this.dependencies.entries()) {
      lines.push(`dependency_status{name="${dep}"} ${record.healthy ? 1 : 0}`);
    }

    lines.push('# HELP dependency_latency_ms Last recorded dependency check latency in ms');
    lines.push('# TYPE dependency_latency_ms gauge');
    for (const [dep, record] of this.dependencies.entries()) {
      if (record.latencyMs !== undefined) {
        lines.push(`dependency_latency_ms{name="${dep}"} ${record.latencyMs}`);
      }
    }

    const mem = process.memoryUsage();
    lines.push('# HELP process_uptime_seconds Total process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${Math.round(process.uptime())}`);

    lines.push('# HELP process_memory_heap_used_bytes V8 heap used in bytes');
    lines.push('# TYPE process_memory_heap_used_bytes gauge');
    lines.push(`process_memory_heap_used_bytes ${mem.heapUsed}`);

    lines.push('# HELP process_memory_heap_total_bytes V8 heap allocated in bytes');
    lines.push('# TYPE process_memory_heap_total_bytes gauge');
    lines.push(`process_memory_heap_total_bytes ${mem.heapTotal}`);

    lines.push('# HELP process_memory_rss_bytes Process Resident Set Size in bytes');
    lines.push('# TYPE process_memory_rss_bytes gauge');
    lines.push(`process_memory_rss_bytes ${mem.rss}`);

    return lines.join('\n') + '\n';
  }
}
