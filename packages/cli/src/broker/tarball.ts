import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const MAX_TARBALL_BYTES = 50 * 1024 * 1024; // 50 MiB

export function validateTarballPath(tarballDir: string, tarballPath: string): string {
  let resolvedDir: string;
  let resolvedPath: string;
  try {
    resolvedDir = realpathSync(resolve(tarballDir));
    resolvedPath = realpathSync(resolve(tarballPath));
  } catch {
    throw new Error('tarball not allowed');
  }
  const rel = relative(resolvedDir, resolvedPath);
  if (rel.startsWith('..') || isAbsolute(rel) || rel === '') {
    throw new Error('tarball not allowed');
  }
  return resolvedPath;
}

export async function readTarballInnerVersion(tarballPath: string): Promise<string> {
  let fileStats;
  try {
    fileStats = await stat(tarballPath);
  } catch {
    throw new Error('tarball not allowed');
  }
  if (fileStats.size > MAX_TARBALL_BYTES || fileStats.size === 0) {
    throw new Error('tarball not allowed');
  }

  let uncompressed: Buffer;
  try {
    const raw = await readFile(tarballPath);
    uncompressed = gunzipSync(raw, { maxOutputLength: 100 * 1024 * 1024 });
  } catch {
    throw new Error('version mismatch');
  }

  let offset = 0;
  while (offset + 512 <= uncompressed.length) {
    const header = uncompressed.subarray(offset, offset + 512);
    const rawName = (header.subarray(0, 100).toString('utf8').split('\0')[0] ?? '').trim();
    if (!rawName) break;
    const rawPrefix = (header.subarray(345, 500).toString('utf8').split('\0')[0] ?? '').trim();
    const fullName = rawPrefix ? `${rawPrefix}/${rawName}` : rawName;

    const sizeStr = (header.subarray(124, 136).toString('utf8').split('\0')[0] ?? '').trim();
    const size = parseInt(sizeStr, 8);
    offset += 512;

    if (fullName === 'package/package.json' || rawName === 'package/package.json') {
      try {
        const content = uncompressed.subarray(offset, offset + size);
        const parsed = JSON.parse(content.toString('utf8')) as { version?: unknown };
        if (typeof parsed.version === 'string' && parsed.version.length > 0) {
          return parsed.version;
        }
      } catch {
        throw new Error('version mismatch');
      }
      throw new Error('version mismatch');
    }
    offset += Math.ceil(size / 512) * 512;
  }
  throw new Error('version mismatch');
}

export async function getTarballMetadata(tarballPath: string): Promise<{ sha256: string; size: number }> {
  const content = await readFile(tarballPath);
  return {
    sha256: createHash('sha256').update(content).digest('hex'),
    size: content.length,
  };
}

