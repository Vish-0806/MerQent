import { Module } from '@nestjs/common';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [StorageModule, DatabaseModule, AuthModule, RedisModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
