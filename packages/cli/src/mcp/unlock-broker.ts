import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';

const MAX_BODY_BYTES = 16_384;
const EXPIRES_AFTER_MS = 5 * 60 * 1_000;

export class UnlockBroker {
  private server?: Server;
  private token?: string;
  private password?: string;
  private expiresAt = 0;

  async createUrl(): Promise<string> {
    await this.close();
    this.token = randomBytes(24).toString('base64url');
    this.expiresAt = Date.now() + EXPIRES_AFTER_MS;
    this.server = createServer((request, response) => void this.handle(request, response));
    await new Promise<void>((resolve, reject) => this.server!.listen(0, '127.0.0.1', resolve).once('error', reject));
    const address = this.server.address();
    if (!address || typeof address === 'string') throw new Error('Unable to start local unlock page');
    return `http://127.0.0.1:${address.port}/unlock/${this.token}`;
  }

  consumePassword(): string | undefined {
    const value = this.password;
    this.password = undefined;
    return value;
  }

  async close(): Promise<void> {
    if (!this.server) return;
    const server = this.server;
    this.server = undefined;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private async handle(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse): Promise<void> {
    const expected = `/unlock/${this.token}`;
    if (request.url !== expected || Date.now() > this.expiresAt) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }).end('This unlock request is invalid or expired.');
      return;
    }
    if (request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" }).end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Unlock SafeGen</title><style>body{margin:0;background:#f5f2e8;color:#101116;font:16px system-ui;display:grid;min-height:100vh;place-items:center}.card{width:min(420px,calc(100% - 40px));border:1px solid #cbc8bc;border-radius:20px;padding:32px;background:#fffdf5}h1{margin:0 0 8px;font-size:30px}p{color:#555}input,button{box-sizing:border-box;width:100%;padding:13px;border-radius:10px;font:inherit}input{border:1px solid #aaa;background:#fff}button{margin-top:14px;border:0;background:#101116;color:#b5f53f;font-weight:700}</style></head><body><form class="card" method="post"><h1>Unlock SafeGen</h1><p>Your master password stays in this local SafeGen process.</p><input name="password" type="password" autocomplete="current-password" required autofocus><button>Unlock vault</button></form></body></html>`);
      return;
    }
    if (request.method !== 'POST') { response.writeHead(405).end(); return; }
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) { response.writeHead(413).end(); return; }
    }
    const password = new URLSearchParams(body).get('password');
    if (!password) { response.writeHead(400).end('Master password is required.'); return; }
    this.password = password;
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end('<!doctype html><title>SafeGen unlocked</title><p>SafeGen is unlocked for this session. You can close this tab.</p>');
    await this.close();
  }
}
