import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the product shell and metadata use the approved SafeGen identity', async () => {
  const [header, html] = await Promise.all([
    readFile(new URL('../src/components/Header.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
  ]);

  assert.match(header, /src="\/logo-mark\.svg"/);
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
  assert.match(html, /property="og:image" content="https:\/\/safegen\.poorvithmp\.com\/og\.png"/);
});

test('SafeGen ships the approved credential identity at required sizes', async () => {
  const [logo, cover, favicon, apple, og] = await Promise.all([
    readFile(new URL('../public/logo-mark.svg', import.meta.url), 'utf8'),
    readFile(new URL('../public/cover.svg', import.meta.url), 'utf8'),
    readFile(new URL('../public/favicon.png', import.meta.url)),
    readFile(new URL('../public/apple-touch-icon.png', import.meta.url)),
    readFile(new URL('../public/og.png', import.meta.url)),
  ]);
  const pngSize = (source) => ({ width: source.readUInt32BE(16), height: source.readUInt32BE(20) });
  assert.match(logo, /<title[^>]*>SafeGen logo<\/title>/);
  assert.match(cover, /Generate strong credentials on your device\./);
  assert.deepEqual(pngSize(favicon), { width: 32, height: 32 });
  assert.deepEqual(pngSize(apple), { width: 180, height: 180 });
  assert.deepEqual(pngSize(og), { width: 1200, height: 630 });
});
