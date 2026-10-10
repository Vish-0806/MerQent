export const QUEUE_FILE_PROCESSING = 'file-processing';
export const FILE_PROCESSING_QUEUE = QUEUE_FILE_PROCESSING;
export const QUEUE_NOTIFICATIONS = 'notifications';

export const JOB_MALWARE_SCAN = 'malware-scan';
export const JOB_CLEANUP_ABANDONED = 'cleanup-abandoned';

/**
 * Reliability & Retention Constants for BullMQ
 */
export const DEFAULT_JOB_ATTEMPTS = 3;
export const DEFAULT_BACKOFF_DELAY_MS = 1000;
export const DEFAULT_JOB_BACKOFF_DELAY_MS = DEFAULT_BACKOFF_DELAY_MS;
export const DEFAULT_JOB_TIMEOUT_MS = 60000; // 60 seconds

// Prevent unbounded Redis memory growth
export const COMPLETED_JOB_RETENTION_COUNT = 1000;
export const COMPLETED_JOB_RETENTION_AGE_SECONDS = 3600; // 1 hour
export const FAILED_JOB_RETENTION_COUNT = 5000;
export const FAILED_JOB_RETENTION_AGE_SECONDS = 86400; // 24 hours

export const JOBS_CONFIG_TOKEN = 'JOBS_CONFIG_TOKEN';
export const FILE_QUEUE_TOKEN = 'FILE_QUEUE_TOKEN';
