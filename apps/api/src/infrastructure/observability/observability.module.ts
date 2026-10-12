import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger.service';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsAuthGuard } from './metrics-auth.guard';
import { AuthModule } from '../../modules/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [MetricsController],
  providers: [AppLogger, MetricsService, MetricsAuthGuard],
  exports: [AppLogger, MetricsService, MetricsAuthGuard],
})
export class ObservabilityModule {}
