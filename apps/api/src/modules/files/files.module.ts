import { Module } from '@nestjs/common';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class FilesModule {}
