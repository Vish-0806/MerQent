/**
 * Realtime & WebSocket Constants for MerQent
 */

export const REALTIME_NAMESPACE = '/realtime';

export const ROOM_PREFIX_USER = 'user:';
export const ROOM_PREFIX_FIRM = 'firm:';
export const ROOM_PREFIX_PROJECT = 'project:';

/**
 * Security & Rate Limiting Thresholds
 */
export const WS_MAX_CONNECTIONS_PER_USER = 10;
export const WS_RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds sliding window
export const WS_RATE_LIMIT_MAX_EVENTS = 30; // Max 30 events per window per socket
export const WS_MAX_HTTP_BUFFER_SIZE = 65536; // 64 KB max frame payload (prevents memory exhaustion)

export const REALTIME_SERVICE_TOKEN = 'REALTIME_SERVICE_TOKEN';
