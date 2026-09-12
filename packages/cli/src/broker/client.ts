import { z } from 'zod';
import { actionSchema, boundedJson, resultSchema } from './actions.js';

export const requestStateSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['pending', 'executing', 'completed', 'failed', 'denied', 'expired', 'revoked']),
  expiresAt: z.number().finite(),
  result: resultSchema.optional(),
}).strict();
const catalogSchema = z.object({ connections: z.array(z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/),
  provider: z.enum(['github', 'cloudflare', 'npm']),
  actions: z.array(z.enum(['github.run-status', 'github.rerun', 'cloudflare.deployments', 'cloudflare.deploy-version', 'npm.view-latest', 'npm.publish-tarball'])).max(4),
}).strict()).max(50) }).strict();

export class BrokerClient {
  readonly url: string;
  constructor(url = 'http://127.0.0.1:4767') {
    if (!/^http:\/\/127\.0\.0\.1:[0-9]{1,5}\/?$/.test(url)) throw new Error('Broker must use a numeric loopback address and port');
    const parsed = new URL(url);
    if (!parsed.port || Number(parsed.port) < 1) throw new Error('Broker port is invalid');
    this.url = parsed.origin;
  }

  private async call<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
    try {
      const response = await fetch(`${this.url}${path}`, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(5_000),
        ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      });
      if (!response.ok || response.redirected) { await response.body?.cancel(); throw new Error('Broker request failed'); }
      return schema.parse(await boundedJson(response));
    } catch { throw new Error('SafeGen broker unavailable or request rejected. Ask the owner to check the local broker.'); }
  }

  connections() { return this.call('/v1/connections', catalogSchema); }
  async request(input: unknown) {
    const parsed = actionSchema.safeParse(input);
    if (!parsed.success) throw new Error('Invalid action parameters');
    return this.call('/v1/requests', requestStateSchema, parsed.data);
  }
  async status(requestId: string) {
    if (!z.string().uuid().safeParse(requestId).success) throw new Error('Invalid request identifier');
    return this.call(`/v1/requests/${requestId}`, requestStateSchema);
  }
}
