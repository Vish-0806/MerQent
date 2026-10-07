import { Module } from '@nestjs/common';
import { SearchInfrastructureModule } from '../../infrastructure/search/search.module';

@Module({
  imports: [SearchInfrastructureModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class SearchModule {}
