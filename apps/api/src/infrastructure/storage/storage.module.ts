import { Module } from '@nestjs/common';
import { STORAGE_SERVICE_TOKEN } from './storage.interface';
import { S3StorageService } from './s3-storage.service';
import { MALWARE_SCANNER_TOKEN } from './malware/malware-scanner.interface';
import { BoundaryMalwareScannerService } from './malware/boundary-malware-scanner.service';

@Module({
  providers: [
    S3StorageService,
    {
      provide: STORAGE_SERVICE_TOKEN,
      useClass: S3StorageService,
    },
    BoundaryMalwareScannerService,
    {
      provide: MALWARE_SCANNER_TOKEN,
      useClass: BoundaryMalwareScannerService,
    },
  ],
  exports: [
    STORAGE_SERVICE_TOKEN,
    S3StorageService,
    MALWARE_SCANNER_TOKEN,
    BoundaryMalwareScannerService,
  ],
})
export class StorageModule {}
