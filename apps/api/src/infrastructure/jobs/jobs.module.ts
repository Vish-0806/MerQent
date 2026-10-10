import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { FileQueueProducer } from './producers/file-queue.producer';
import { FileQueueProcessor } from './processors/file-queue.processor';
import { JobsService } from './jobs.service';

@Module({
  imports: [CommonModule, DatabaseModule, StorageModule],
  providers: [FileQueueProducer, FileQueueProcessor, JobsService],
  exports: [FileQueueProducer, FileQueueProcessor, JobsService],
})
export class JobsModule {}
