import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Optional,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UserRole } from '@merqent/shared-types';
import { RedisService } from '../redis/redis.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { JwtAccessPayload } from '../../modules/auth/interfaces/token-payload.interface';

/**
 * Guard that restricts access to /api/v1/metrics.
 *
 * Enforces two authorized access pathways:
 * 1. Machine-to-Machine (M2M) Monitoring Scrapers (Prometheus, Datadog):
 *    - Authenticated via 'x-metrics-key' header or 'Authorization: Bearer <key>'
 *    - Evaluated against server-configured METRICS_SCRAPE_KEY using constant-time comparison
 *    - If METRICS_SCRAPE_KEY is not configured or empty, M2M access fails closed
 * 2. Administrative User Access (RBAC):
 *    - Authenticated via standard MerQent JWT (Bearer token)
 *    - Strictly requires UserRole.PLATFORM_ADMIN
 *    - Non-admin authenticated roles (PE_FIRM_ADMIN, PE_FIRM_MEMBER, etc.) are denied with HTTP 403 Forbidden
 *
 * Unauthenticated requests and invalid credentials receive HTTP 401 Unauthorized.
 * Hostnames, IP addresses, and Docker networks are NEVER treated as implicitly trusted.
 */
@Injectable()
export class MetricsAuthGuard implements CanActivate {
  private readonly logger = new Logger(MetricsAuthGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly requestContextService?: RequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const configuredScrapeKey =
      this.configService.get<string>('observability.metricsScrapeKey') ||
      process.env.METRICS_SCRAPE_KEY ||
      '';

    const nodeEnv =
      this.configService.get<string>('app.nodeEnv') || process.env.NODE_ENV || 'development';

    // In production, enforce minimum 32 characters if configured; fail closed if weak
    const isWeakInProduction =
      nodeEnv === 'production' &&
      configuredScrapeKey.trim() !== '' &&
      configuredScrapeKey.trim().length < 32;

    const isScraperKeyConfigured = configuredScrapeKey.trim() !== '' && !isWeakInProduction;

    const headerKey = request.headers['x-metrics-key'];
    const authHeader = request.headers['authorization'];

    // Pathway 1: Explicit M2M Scraper Header ('x-metrics-key')
    if (headerKey !== undefined) {
      if (typeof headerKey !== 'string' || headerKey.trim() === '') {
        throw new UnauthorizedException('Invalid or empty x-metrics-key header');
      }

      if (!configuredScrapeKey || configuredScrapeKey.trim() === '') {
        this.logger.warn(
          'M2M metrics scraper authentication rejected: METRICS_SCRAPE_KEY is not configured on server',
        );
        throw new UnauthorizedException(
          'Machine-to-machine metrics authentication is not configured on this server',
        );
      }

      if (isWeakInProduction) {
        this.logger.warn(
          'M2M metrics scraper authentication rejected: METRICS_SCRAPE_KEY is weak (< 32 characters) in production',
        );
        throw new UnauthorizedException(
          'Machine-to-machine metrics authentication is not configured on this server',
        );
      }

      if (this.safeCompare(headerKey.trim(), configuredScrapeKey.trim())) {
        request.user = {
          id: 'system:metrics-scraper',
          email: 'monitoring@system.local',
          role: UserRole.PLATFORM_ADMIN,
        };
        return true;
      }

      this.logger.warn('M2M metrics scraper authentication rejected: Invalid x-metrics-key');
      throw new UnauthorizedException('Invalid metrics scraper authentication key');
    }

    // Pathway 2: Authorization Header (Bearer Scraper Key OR Bearer User JWT)
    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Authentication required to access operational telemetry');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format; expected Bearer token');
    }

    // 2A: Check if Bearer token matches configured M2M scrape key
    if (isScraperKeyConfigured && this.safeCompare(token.trim(), configuredScrapeKey.trim())) {
      request.user = {
        id: 'system:metrics-scraper',
        email: 'monitoring@system.local',
        role: UserRole.PLATFORM_ADMIN,
      };
      return true;
    }

    // 2B: Validate User JWT and enforce PLATFORM_ADMIN role
    try {
      const secret = this.configService.get<string>('jwt.secret') || process.env.JWT_ACCESS_SECRET;
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token, { secret });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token purpose; access token required');
      }

      if (this.redisService) {
        const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      if (payload.role !== UserRole.PLATFORM_ADMIN) {
        this.logger.warn(
          `Metrics access denied for user '${payload.sub}' with unauthorized role '${payload.role}'`,
        );
        throw new ForbiddenException(
          `Forbidden: Role '${payload.role}' is not authorized to access operational telemetry (PLATFORM_ADMIN required)`,
        );
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        firmId: payload.firmId,
        consultantProfileId: payload.consultantProfileId,
      };

      if (this.requestContextService) {
        this.requestContextService.setUser(request.user);
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.debug(
        `Metrics JWT authentication failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Invalid or expired authentication credentials');
    }
  }

  /**
   * Fixed-size digest comparison strategy for scraper credential verification.
   *
   * Hashes both the candidate and configured secret with SHA-256 before invoking
   * crypto.timingSafeEqual() on their resulting 32-byte digests.
   *
   * What this protects against:
   * 1. Eliminates Node.js Buffer length-mismatch exceptions (RangeError) when candidate
   *    and target have different character lengths, preventing HTTP 500 errors.
   * 2. Protects against secret extraction via character-by-character timing oracles
   *    during the secret comparison step itself by comparing fixed-size 32-byte hashes.
   *
   * What this does NOT protect against:
   * 1. Does not guarantee mathematically constant-time execution for the entire HTTP request lifecycle
   *    (e.g., HTTP header parsing, hashing execution time proportional to input length, TCP transmission latency).
   * 2. Does not eliminate network-level latency variance or CPU scheduling jitter.
   */
  private safeCompare(candidate: string, target: string): boolean {
    if (!candidate || !target) return false;
    try {
      const hashCandidate = crypto.createHash('sha256').update(candidate, 'utf8').digest();
      const hashTarget = crypto.createHash('sha256').update(target, 'utf8').digest();

      return crypto.timingSafeEqual(hashCandidate, hashTarget);
    } catch {
      return false;
    }
  }
}
