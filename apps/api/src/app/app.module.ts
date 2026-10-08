import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { AppController } from './app.controller';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';

// Infrastructure Modules
import { DatabaseModule } from '../infrastructure/database/database.module';
import { ObservabilityModule } from '../infrastructure/observability/observability.module';
import { RealtimeModule } from '../infrastructure/realtime/realtime.module';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { EmailModule } from '../infrastructure/email/email.module';
import { AiModule } from '../infrastructure/ai/ai.module';
import { SearchInfrastructureModule } from '../infrastructure/search/search.module';

// Domain Module Shells (Architecture-Ready)
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { OrganizationsModule } from '../modules/organizations/organizations.module';
import { ConsultantsModule } from '../modules/consultants/consultants.module';
import { TaxonomiesModule } from '../modules/taxonomies/taxonomies.module';
import { ProjectsModule } from '../modules/projects/projects.module';
import { SearchModule } from '../modules/search/search.module';
import { MatchingModule } from '../modules/matching/matching.module';
import { ShortlistsModule } from '../modules/shortlists/shortlists.module';
import { ConnectionsModule } from '../modules/connections/connections.module';
import { MessagingModule } from '../modules/messaging/messaging.module';
import { SchedulingModule } from '../modules/scheduling/scheduling.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { FilesModule } from '../modules/files/files.module';
import { VerificationModule } from '../modules/verification/verification.module';
import { AdministrationModule } from '../modules/administration/administration.module';
import { AnalyticsModule } from '../modules/analytics/analytics.module';
import { AuditModule } from '../modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    ObservabilityModule,
    RealtimeModule,
    StorageModule,
    EmailModule,
    AiModule,
    SearchInfrastructureModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ConsultantsModule,
    TaxonomiesModule,
    ProjectsModule,
    SearchModule,
    MatchingModule,
    ShortlistsModule,
    ConnectionsModule,
    MessagingModule,
    SchedulingModule,
    NotificationsModule,
    FilesModule,
    VerificationModule,
    AdministrationModule,
    AnalyticsModule,
    AuditModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
