import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const historyModuleUrl = new URL('../src/utils/history.ts', import.meta.url);
const clipboardModuleUrl = new URL('../src/utils/clipboard.ts', import.meta.url);

async function historyUtils() {
  try {
    return await importTypeScript(historyModuleUrl);
  } catch {
    return {};
  }
}

async function importTypeScript(url) {
  const source = await readFile(url, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: url.pathname,
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const item = (password, overrides = {}) => ({
  id: '4f188901-d6a9-4a55-b6d8-5e8d4b1a5db7',
  password,
  timestamp: 1_700_000_000_000,
  mode: 'random',
  rating: 'Strong',
  entropy: 80,
  isFavorite: false,
  ...overrides,
});

test('stored history accepts only complete records and caps restored plaintext entries', async () => {
  const { parseStoredHistory } = await historyUtils();
  assert.equal(typeof parseStoredHistory, 'function');

  const records = Array.from({ length: 51 }, (_, index) => item(`secret-${index}`, { id: `id-${index}` }));
  assert.equal(parseStoredHistory(JSON.stringify(records)).items.length, 50);
  assert.equal(parseStoredHistory(JSON.stringify([{ password: 'partial' }])).status, 'invalid');
  assert.equal(parseStoredHistory('{broken').status, 'invalid');
});

test('CSV export neutralizes spreadsheet formulas in every text cell', async () => {
  const { serializeHistory } = await historyUtils();
  assert.equal(typeof serializeHistory, 'function');

  const exported = serializeHistory([
    item('=HYPERLINK("https://example.invalid")', { id: '+formula', mode: 'pattern' }),
  ], 'csv');
  assert.match(exported.data, /"'=HYPERLINK\(""https:\/\/example\.invalid""\)"/);
  assert.match(exported.data, /"'\+formula"/);
  assert.ok(serializeHistory([item('\n=1+1')], 'csv').data.includes("\"'\n=1+1\""));
});

test('stored history deletion reports failure instead of claiming the plaintext copy is gone', async () => {
  const { removeStoredHistory } = await historyUtils();
  assert.equal(typeof removeStoredHistory, 'function');
  assert.equal(removeStoredHistory({ removeItem: () => { throw new Error('blocked'); } }), false);
  let removedKey = '';
  assert.equal(removeStoredHistory({ removeItem: (key) => { removedKey = key; } }), true);
  assert.equal(removedKey, 'safegen-history-vault');
});

test('copy helper rejects when both Clipboard API and the local fallback fail', async () => {
  let copyText;
  try {
    ({ copyText } = await importTypeScript(clipboardModuleUrl));
  } catch {
    // The first TDD run proves the shared clipboard behavior is missing.
  }
  assert.equal(typeof copyText, 'function');

  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async () => { throw new Error('denied'); } } },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: { appendChild: () => undefined, removeChild: () => undefined },
      createElement: () => ({ value: '', style: {}, focus: () => undefined, select: () => undefined }),
      execCommand: () => false,
    },
  });
  try {
    await assert.rejects(copyText('secret'), /Clipboard permission was denied/);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
  }
});

test('service worker ignores credentials and cross-origin requests while caching local static assets', async () => {
  let source = '';
  try {
    source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  } catch {
    // The first TDD run proves the offline policy is not implemented yet.
  }
  assert.ok(source);

  const listeners = {};
  const addedAssets = [];
  const context = {
    URL,
    fetch: async (request) => {
      const url = typeof request === 'string' ? request : request.url;
      if (url.endsWith('/index.html')) {
        return new Response('<script src="/assets/app.js"></script><link href="/assets/app.css"><script src="https://tracker.example/x.js"></script>');
      }
      return new Response('asset');
    },
    caches: {
      open: async () => ({
        match: async (_request, options) => options?.ignoreVary ? new Response('cached asset') : undefined,
        put: async () => undefined,
        addAll: async (assets) => { addedAssets.push(...assets); },
      }),
      keys: async () => [],
      delete: async () => true,
      match: async () => undefined,
    },
    Response,
    self: {
      location: { origin: 'https://safegen.example' },
      addEventListener: (name, listener) => { listeners[name] = listener; },
      skipWaiting: () => undefined,
      clients: { claim: () => undefined },
    },
  };
  vm.runInNewContext(source, context);

  let installWork;
  listeners.install({ waitUntil: (promise) => { installWork = promise; } });
  await installWork;
  assert.ok(addedAssets.includes('/assets/app.js'));
  assert.ok(addedAssets.includes('/assets/app.css'));
  assert.equal(addedAssets.some((asset) => asset.startsWith('https://')), false);

  for (const request of [
    new Request('https://safegen.example/api/credentials', { method: 'POST', body: 'secret' }),
    new Request('https://tracker.example/script.js'),
    new Request('https://safegen.example/api/credentials'),
  ]) {
    let handled = false;
    listeners.fetch({ request, respondWith: () => { handled = true; } });
    assert.equal(handled, false);
  }

  let handledAsset;
  const assetRequest = new Request('https://safegen.example/assets/app.js');
  Object.defineProperty(assetRequest, 'destination', { value: 'script' });
  listeners.fetch({ request: assetRequest, respondWith: (response) => { handledAsset = response; } });
  assert.equal(await (await handledAsset).text(), 'cached asset');

  let handledShellImage = false;
  const shellImageRequest = new Request('https://safegen.example/logo-mark.svg');
  Object.defineProperty(shellImageRequest, 'destination', { value: 'image' });
  listeners.fetch({ request: shellImageRequest, respondWith: () => { handledShellImage = true; } });
  assert.equal(handledShellImage, true);
});
