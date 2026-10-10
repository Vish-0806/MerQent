import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app/app.module';
import { AppLogger } from './infrastructure/observability/logger.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsService } from './infrastructure/observability/metrics.service';
import { ErrorCode, ApiErrorDetail } from '@merqent/shared-types';

import { RedisIoAdapter } from './infrastructure/realtime/redis-io.adapter';
import { RealtimeService } from './infrastructure/realtime/realtime.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  // Configure multi-instance Socket.IO Redis adapter with graceful fallback
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  try {
    const realtimeService = app.get(RealtimeService);
    realtimeService.setRedisAdapter(redisIoAdapter);
  } catch (err: unknown) {
    logger.warn(`Could not attach Redis adapter to RealtimeService: ${(err as Error).message}`);
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);

  // Configure trusted deployment proxies for secure forwarded-IP extraction
  const rawTrustProxy = configService.get<string | boolean | number>('trustProxy', 'false');
  let trustProxySetting: boolean | number | string = false;
  if (rawTrustProxy === true || rawTrustProxy === 'true') {
    trustProxySetting = true;
  } else if (rawTrustProxy === false || rawTrustProxy === 'false') {
    trustProxySetting = false;
  } else if (!isNaN(Number(rawTrustProxy))) {
    trustProxySetting = Number(rawTrustProxy);
  } else if (typeof rawTrustProxy === 'string') {
    trustProxySetting = rawTrustProxy;
  }
  const httpAdapter = app.getHttpAdapter();
  if (
    httpAdapter &&
    typeof (httpAdapter.getInstance() as { set?: (...args: unknown[]) => void })?.set === 'function'
  ) {
    (httpAdapter.getInstance() as { set: (...args: unknown[]) => void }).set(
      'trust proxy',
      trustProxySetting,
    );
    logger.log(`🛡️ Trusted proxy configuration set to: ${String(trustProxySetting)}`);
  }

  // Parse allowed origins into normalized array
  const rawCorsOrigins = configService.get<string | string[]>('cors.origins', [
    'http://localhost:3000',
  ]);
  const allowedOrigins: string[] = Array.isArray(rawCorsOrigins)
    ? rawCorsOrigins
    : typeof rawCorsOrigins === 'string'
      ? rawCorsOrigins.split(',').map((o) => o.trim())
      : ['http://localhost:3000'];

  // Security: Payload body size limits (1MB default mitigates JSON DoS)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Hardened CORS configuration (rejects wildcards with credentials)
  app.enableCors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (curl, server-to-server, mobile native)
      if (!requestOrigin) {
        return callback(null, true);
      }
      // Check allowlist
      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }
      // In development/test, allow localhost ports
      if (
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
      ) {
        return callback(null, true);
      }
      // Reject unauthorized origins
      callback(new Error('CORS origin rejected by security policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-request-id',
      'x-correlation-id',
      'x-refresh-token',
      'Accept',
    ],
    exposedHeaders: ['x-correlation-id'],
    maxAge: 86400,
  });

  // Global API route prefix
  app.setGlobalPrefix('api/v1');

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors (Logging with correlation ID + standard response envelope)
  const reflector = app.get(Reflector);
  const metrics = app.get(MetricsService);
  app.useGlobalInterceptors(new LoggingInterceptor(metrics), new TransformInterceptor(reflector));

  // Global validation pipe with structured error formatting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (validationErrors) => {
        const details: ApiErrorDetail[] = [];
        const formatErrors = (errors: typeof validationErrors, parentPath = ''): void => {
          for (const err of errors) {
            const field = parentPath ? `${parentPath}.${err.property}` : err.property;
            if (err.constraints) {
              for (const [code, message] of Object.entries(err.constraints)) {
                details.push({ field, message, code });
              }
            }
            if (err.children && err.children.length > 0) {
              formatErrors(err.children, field);
            }
          }
        };

        formatErrors(validationErrors);
        const errorMessages = details.map((d) =>
          d.field ? `${d.field}: ${d.message}` : d.message,
        );
        return new BadRequestException({
          message: errorMessages,
          errorCode: ErrorCode.VALIDATION_ERROR,
          error: 'Bad Request',
          details,
        });
      },
    }),
  );

  // OpenAPI Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MerQent API')
    .setDescription(
      'Specialized enterprise B2B marketplace and collaboration platform connecting Private Equity firms with Post-Merger Integration (PMI) operators.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your 15-minute access token',
        in: 'header',
      },
      'bearer-jwt',
    )
    .addTag('Health', 'API runtime health probes and database connectivity verification')
    .addTag('Observability', 'Application telemetry, request metrics, and latency diagnostics')
    .addTag('Auth', 'Dual-token authentication and session lifecycle')
    .addTag('Users', 'User accounts, permissions, and roles')
    .addTag('Organizations', 'PE firms, portfolio companies, and advisory firms')
    .addTag('Consultants', 'Vetted PMI operator profiles and verified deal history')
    .addTag('Projects', 'M&A integration mandates and confidential project scoping')
    .addTag('Matching', 'Grounded hybrid AI recommendations and evidence scoring')
    .addTag('Messaging', 'Real-time relationship-gated messaging and document attachments')
    .addTag('Scheduling', 'Timezone-aware calendar coordination and ICS generation')
    .addTag('Notifications', 'System alerts and engagement updates')
    .addTag('Taxonomies', 'Governed ERPs, deal archetypes, and PMI workstreams')
    .addTag('Admin', 'Verification queues, governance, and audit trails')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 MerQent API server running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 OpenAPI Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
