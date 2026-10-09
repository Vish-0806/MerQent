import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger.service';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [AppLogger, MetricsService],
  exports: [AppLogger, MetricsService],
})
export class ObservabilityModule {}
