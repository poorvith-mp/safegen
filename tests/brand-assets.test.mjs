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
