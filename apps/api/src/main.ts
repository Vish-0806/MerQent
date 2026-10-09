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
import { ErrorCode, ApiErrorDetail } from '@merqent/shared-types';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);
  const corsOrigins = configService.get<string | string[]>('cors.origins', [
    'http://localhost:3000',
  ]);

  // Security: Payload body size limits
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id', 'Accept'],
    exposedHeaders: ['x-correlation-id'],
  });

  // Global API route prefix
  app.setGlobalPrefix('api/v1');

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors (Logging with correlation ID + standard response envelope)
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor(reflector));

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
