import { Module } from '@nestjs/common';
import { EmailModule } from '../../infrastructure/email/email.module';
import { RealtimeModule } from '../../infrastructure/realtime/realtime.module';

@Module({
  imports: [EmailModule, RealtimeModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class NotificationsModule {}
