import { randomBytes, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { VaultStore } from '../vault/store.js';
import { actionSchema, connectionSchema, executeAction, validateAction, type Action, type ActionResult, type Connection, type Transport } from './actions.js';

type RequestStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'denied' | 'expired' | 'revoked';
interface ActionRequest {
  requestId: string;
  action: Action;
  connection: Connection;
  status: RequestStatus;
  expiresAt: number;
  result?: ActionResult;
  abort: AbortController;
}
interface BrokerOptions {
  connections: Connection[];
  vault: Pick<VaultStore, 'read' | 'get'>;
  logPath: string;
  port?: number;
  transport?: Transport;
  requestTtlMs?: number;
  sessionTtlMs?: number;
  revokeConnection?: (id: string) => Promise<void>;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const actionsFor = (provider: string) => provider === 'github' ? ['github.run-status', 'github.rerun'] : ['cloudflare.deployments', 'cloudflare.deploy-version'];

async function readBody(request: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8_192) throw new Error('Request too large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Launch from the vault owner's private OS session, never from the agent's MCP process. */
export async function startBroker(options: BrokerOptions) {
  const connections = new Map(options.connections.map(value => { const item = connectionSchema.parse(value); return [item.id, item] as const; }));
  if (connections.size !== options.connections.length || connections.size > 50) throw new Error('Connection configuration is invalid');
  const requests = new Map<string, ActionRequest>();
  const controlPath = `/control/${randomBytes(32).toString('base64url')}`;
  const csrf = randomBytes(32).toString('base64url');
  const ttl = Math.max(10, Math.min(options.requestTtlMs ?? 120_000, 120_000));
  const sessionTtl = Math.max(10, Math.min(options.sessionTtlMs ?? 300_000, 300_000));
  let masterPassword: string | undefined;
  let unlockedUntil = 0;
  let url = '';
  let closing = false;
  let ownerBusy = false;
  let lockEpoch = 0;
  let persistence = Promise.resolve();
  const activity: string[] = [];
  await mkdir(dirname(options.logPath), { recursive: true, mode: 0o700 });

  const record = async (event: string, entry?: ActionRequest) => {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), event, ...(entry ? { requestId: entry.requestId, connection: entry.action.connection, action: entry.action.action } : {}) });
    await appendFile(options.logPath, `${line}\n`, { mode: 0o600 });
    activity.unshift(line);
    activity.splice(50);
  };
  const revoke = (entry: ActionRequest, status: 'expired' | 'revoked') => {
    entry.abort.abort();
    entry.status = status;
    entry.result = undefined;
  };
  const lock = () => {
    lockEpoch++;
    masterPassword = undefined;
    unlockedUntil = 0;
    for (const entry of requests.values()) {
      if (entry.status === 'pending' || entry.status === 'executing') revoke(entry, 'revoked');
    }
  };
  const expire = () => {
    if (masterPassword && Date.now() >= unlockedUntil) lock();
    for (const entry of requests.values()) {
      if (Date.now() >= entry.expiresAt) {
        if (entry.status === 'pending' || entry.status === 'executing') {
          revoke(entry, 'expired');
          void record('expired', entry).catch(() => lock());
        } else if (Date.now() >= entry.expiresAt + 120_000) requests.delete(entry.requestId);
      }
    }
  };
  const timer = setInterval(expire, Math.min(ttl, 1_000));
  timer.unref();
  const json = (response: ServerResponse, code: number, value: unknown) => response.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify(value));
  const form = (operation: string, extra = '') => `<form method="post"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="operation" value="${operation}">${extra}</form>`;

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    for (const [name, value] of Object.entries({
      'cache-control': 'no-store', 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    })) response.setHeader(name, value);
    if (closing || request.headers.host !== new URL(url).host) { json(response, 403, { error: 'Request not permitted' }); return; }
    expire();
    const path = request.url;
    if (path === controlPath) {
      if (request.method === 'GET') {
        const entries = [...requests.values()].reverse().map(entry => {
          const target = entry.connection.provider === 'github' ? entry.connection.repository : `${entry.connection.accountId}/${entry.connection.worker}`;
          return `<article><strong>${escapeHtml(entry.action.action)} · ${entry.status}</strong><pre>${escapeHtml(JSON.stringify({ account: entry.connection.id, target, ...entry.action }, null, 2))}</pre><p>Expires ${escapeHtml(new Date(entry.expiresAt).toISOString())}</p>${entry.status === 'pending' ? form('approve', `<input type="hidden" name="requestId" value="${entry.requestId}"><button ${masterPassword ? '' : 'disabled'}>Approve this exact action</button>`) + form('deny', `<input type="hidden" name="requestId" value="${entry.requestId}"><button>Deny</button>`) : ''}</article>`;
        }).join('');
        const configured = [...connections.values()].map(connection => `<li>${escapeHtml(connection.id)} (${connection.provider})${form('revoke', `<input type="hidden" name="connection" value="${escapeHtml(connection.id)}"><button>Revoke this connection</button>`)}</li>`).join('');
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SafeGen owner controls</title><style>body{max-width:850px;margin:40px auto;padding:0 20px;background:#f6f5f0;color:#151815;font:16px system-ui}h1{font-size:32px}article{border:1px solid #bbb;border-radius:12px;margin:16px 0;padding:20px;background:white}button,input{padding:12px;margin:5px 5px 5px 0;font:inherit}button{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere}form{display:inline-block}input[type=password]{display:block}a{color:#14623e}</style></head><body><h1>SafeGen owner controls</h1><p>This page belongs in your private owner browser. Keep it outside agent browser automation. Credentials are sent only to the configured provider.</p><p><strong>${masterPassword ? 'Unlocked — auto-locks after five minutes or your configured shorter limit.' : 'Locked'}</strong> <a href="${controlPath}">Refresh requests</a></p>${masterPassword ? form('lock', '<button>Lock and revoke pending actions</button>') : form('unlock', '<label>Master password<input name="password" type="password" autocomplete="off" required maxlength="4096"></label><button>Unlock locally</button>')}<p>Actions already sent to a provider may finish after locking; locking prevents new dispatches.</p><h2>Requests</h2>${entries || '<p>No requests. Ask the agent to submit an action, then refresh this page.</p>'}<h2>Connections</h2><ul>${configured}</ul><h2>Recent activity</h2><pre>${escapeHtml(activity.join('\n'))}</pre></body></html>`);
        return;
      }
      if (request.method !== 'POST' || request.headers.origin !== url || !request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) { json(response, 403, { error: 'Request not permitted' }); return; }
      const body = new URLSearchParams(await readBody(request));
      if (body.get('csrf') !== csrf) { json(response, 403, { error: 'Request not permitted' }); return; }
      const operation = body.get('operation');
      // Owner actions are serialized so unlock/approve/revoke cannot race one another.
      const exclusive = operation === 'approve' || operation === 'unlock';
      if (exclusive && ownerBusy) { json(response, 409, { error: 'Another owner action is in progress' }); return; }
      if (exclusive) ownerBusy = true;
      try {
        if (operation === 'unlock') {
          const password = body.get('password') ?? '';
          const epoch = lockEpoch;
          if (!password || password.length > 4096) throw new Error('Invalid password');
          await options.vault.read(password);
          await record('unlocked');
          if (closing || lockEpoch !== epoch) throw new Error('Broker locked');
          masterPassword = password;
          unlockedUntil = Date.now() + sessionTtl;
        } else if (operation === 'lock') {
          lock();
          await record('locked');
        } else if (operation === 'revoke') {
          const id = body.get('connection') ?? '';
          if (!connections.has(id)) { json(response, 404, { error: 'Connection not found' }); return; }
          connections.delete(id);
          for (const entry of requests.values()) if (entry.action.connection === id && (entry.status === 'pending' || entry.status === 'executing')) revoke(entry, 'revoked');
          // Revoke immediately, but serialize disk mutations so concurrent removals cannot overwrite each other.
          const saved = persistence.then(() => options.revokeConnection?.(id));
          persistence = saved.catch(() => {});
          await saved;
          await record('connection-revoked');
        } else if (operation === 'approve' || operation === 'deny') {
          const entry = requests.get(body.get('requestId') ?? '');
          if (!entry || entry.status !== 'pending' || entry.expiresAt <= Date.now()) { json(response, 409, { error: 'Request is no longer pending' }); return; }
          if (operation === 'deny') { entry.status = 'denied'; await record('denied', entry); }
          else {
            if (!masterPassword) { json(response, 409, { error: 'Unlock the vault first' }); return; }
            entry.status = 'executing';
            try {
              await record('approved', entry);
              const credential = await options.vault.get(`safegen:${entry.connection.provider}`, entry.connection.id, masterPassword);
              expire();
              if (entry.abort.signal.aborted || closing || !masterPassword || !connections.has(entry.connection.id)) throw new Error('Request revoked');
              const result = await executeAction(entry.connection, entry.action, credential.credential, options.transport, entry.abort.signal);
              expire();
              if (!entry.abort.signal.aborted) {
                await record('completed', entry);
                expire();
                if (!entry.abort.signal.aborted) { entry.result = result; entry.status = 'completed'; }
              }
            } catch {
              if (!entry.abort.signal.aborted) entry.status = 'failed';
              await record(entry.status, entry);
            }
          }
        } else { json(response, 400, { error: 'Unknown owner operation' }); return; }
        response.writeHead(303, { location: controlPath }).end();
      } catch { lock(); json(response, 400, { error: 'Owner operation failed; vault locked' }); }
      finally { if (exclusive) ownerBusy = false; }
      return;
    }

    // The agent API has no browser CORS or credential/unlock/approval endpoints.
    if (request.headers.origin || request.headers['sec-fetch-site']) { json(response, 403, { error: 'Browser requests are not permitted' }); return; }
    if (path === '/v1/connections' && request.method === 'GET') {
      json(response, 200, { connections: [...connections.values()].map(connection => ({ id: connection.id, provider: connection.provider, actions: actionsFor(connection.provider) })) });
    } else if (path === '/v1/requests' && request.method === 'POST') {
      if (request.headers['content-type'] !== 'application/json') { json(response, 415, { error: 'JSON required' }); return; }
      if (requests.size >= 50) { json(response, 429, { error: 'Request queue is full; retry later' }); return; }
      const action = actionSchema.parse(JSON.parse(await readBody(request)));
      const connection = connections.get(action.connection);
      if (!connection) { json(response, 400, { error: 'Unknown connection' }); return; }
      validateAction(connection, action);
      const entry: ActionRequest = { requestId: randomUUID(), action: Object.freeze(action), connection: Object.freeze({ ...connection }), expiresAt: Date.now() + ttl, status: 'pending', abort: new AbortController() };
      const epoch = lockEpoch;
      await record('requested', entry);
      // Recheck after the log write, since another request may have filled the queue.
      if (requests.size >= 50) { json(response, 429, { error: 'Request queue is full; retry later' }); return; }
      if (closing || lockEpoch !== epoch || connections.get(connection.id) !== connection) { json(response, 409, { error: 'Request revoked before queuing' }); return; }
      requests.set(entry.requestId, entry);
      json(response, 202, { requestId: entry.requestId, status: entry.status, expiresAt: entry.expiresAt });
    } else if (request.method === 'GET' && /^\/v1\/requests\/[a-f0-9-]{36}$/.test(path ?? '')) {
      const entry = requests.get(path!.split('/').pop()!);
      if (!entry) { json(response, 404, { error: 'Request not found' }); return; }
      json(response, 200, { requestId: entry.requestId, status: entry.status, expiresAt: entry.expiresAt, ...(entry.result ? { result: entry.result } : {}) });
    } else json(response, 404, { error: 'Not found' });
  }

  const server = createServer((request, response) => { void handle(request, response).catch(() => { if (!response.headersSent) json(response, 400, { error: 'Invalid request' }); else response.end(); }); });
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.maxHeadersCount = 30;
  server.on('connection', socket => socket.setTimeout(20_000, () => socket.destroy()));
  try { await new Promise<void>((resolve, reject) => server.listen(options.port ?? 0, '127.0.0.1', resolve).once('error', reject)); }
  catch (error) { clearInterval(timer); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Broker failed to listen');
  url = `http://127.0.0.1:${address.port}`;
  return {
    url,
    controlUrl: `${url}${controlPath}`,
    close: async () => {
      closing = true;
      clearInterval(timer);
      lock();
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
      await persistence;
    },
  };
}
