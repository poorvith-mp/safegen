export function secureRandomInt(max: number): number {
  if (!Number.isSafeInteger(max) || max <= 0 || max > 0x1_0000_0000) {
    throw new RangeError('Random range is invalid');
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('A native cryptographic random source is required');
  }
  const sample = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  do globalThis.crypto.getRandomValues(sample); while (sample[0] >= limit);
  return sample[0] % max;
}
