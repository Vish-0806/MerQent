import { Module } from '@nestjs/common';
import { RealtimeModule } from '../../infrastructure/realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class MessagingModule {}
