import { Module } from '@nestjs/common';
import { AiModule } from '../../infrastructure/ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class MatchingModule {}
