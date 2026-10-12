import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';

/**
 * Executes a callback with a safely managed temporary file.
 * Guarantees 100% cleanup of both the temporary file and its containing
 * directory in a finally block, preventing temporary-file leaks even if
 * the callback throws or rejects.
 *
 * @param data Buffer or Readable stream to write to the temporary file
 * @param callback Async function receiving the path to the temporary file
 * @param prefix Optional prefix for the temporary folder
 */
export async function withSafeTempFile<T>(
  data: Buffer | NodeJS.ReadableStream,
  callback: (tempFilePath: string) => Promise<T>,
  prefix = 'merqent-scan-',
): Promise<T> {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), prefix));
  const tempFilePath = path.join(tempDir, `scan-${crypto.randomUUID()}.tmp`);

  try {
    if (Buffer.isBuffer(data)) {
      await fs.promises.writeFile(tempFilePath, data);
    } else {
      const writeStream = fs.createWriteStream(tempFilePath);
      await pipeline(data, writeStream);
    }

    return await callback(tempFilePath);
  } finally {
    // Guaranteed cleanup: remove temp file and temp folder
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Safe no-op on cleanup errors
    }
  }
}
