import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [JwtModule.register({}), DatabaseModule, RedisModule],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeGateway, RealtimeService],
})
export class RealtimeModule {}
