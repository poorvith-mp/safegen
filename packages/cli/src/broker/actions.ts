import { z } from 'zod';

const alias = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/);
const uuid = z.string().uuid();
export const connectionSchema = z.discriminatedUnion('provider', [
  z.object({ id: alias, provider: z.literal('github'), repository: z.string().regex(/^[a-zA-Z0-9_-]{1,100}\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,99}$/) }).strict(),
  z.object({ id: alias, provider: z.literal('cloudflare'), accountId: z.string().regex(/^[a-f0-9]{32}$/i), worker: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/) }).strict(),
]);
export type Connection = z.infer<typeof connectionSchema>;
export const actionSchema = z.discriminatedUnion('action', [
  z.object({ connection: alias, action: z.literal('github.run-status'), runId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict(),
  z.object({ connection: alias, action: z.literal('github.rerun'), runId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict(),
  z.object({ connection: alias, action: z.literal('cloudflare.deployments') }).strict(),
  z.object({ connection: alias, action: z.literal('cloudflare.deploy-version'), versionId: uuid }).strict(),
]);
export type Action = z.infer<typeof actionSchema>;
const status = z.enum(['completed', 'queued', 'in_progress', 'requested', 'waiting', 'pending']);
const conclusion = z.enum(['success', 'failure', 'neutral', 'cancelled', 'skipped', 'timed_out', 'action_required', 'stale', 'startup_failure']).nullable();
const deployment = z.object({ id: uuid, versions: z.array(z.object({ version_id: uuid, percentage: z.number().min(0).max(100) })).max(2) });
export const resultSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('github.run-status'), runId: z.number().int().positive(), status, conclusion }).strict(),
  z.object({ action: z.literal('github.rerun'), runId: z.number().int().positive(), status: z.literal('requested') }).strict(),
  z.object({ action: z.literal('cloudflare.deployments'), deployments: z.array(deployment).max(10) }).strict(),
  z.object({ action: z.literal('cloudflare.deploy-version'), deploymentId: uuid }).strict(),
]);
export type ActionResult = z.infer<typeof resultSchema>;
export type Transport = typeof fetch;

export function validateAction(connection: Connection, input: unknown): Action {
  const action = actionSchema.parse(input);
  connectionSchema.parse(connection);
  if (action.connection !== connection.id || !action.action.startsWith(`${connection.provider}.`)) throw new Error('Action is not permitted for this connection');
  return action;
}

export async function boundedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty response');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 262_144) throw new Error('Response too large');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}

export async function executeAction(connection: Connection, input: unknown, credential: string, transport: Transport = fetch, signal?: AbortSignal): Promise<ActionResult> {
  try {
    const action = validateAction(connection, input);
    if (!credential || credential.length > 8_192 || /[\r\n]/.test(credential)) throw new Error('Invalid credential');
    const headers: Record<string, string> = { Authorization: `Bearer ${credential}`, 'User-Agent': 'SafeGen/3.0', Accept: 'application/json' };
    let url: string;
    let method = 'GET';
    let body: string | undefined;
    if (connection.provider === 'github' && 'runId' in action) {
      headers.Accept = 'application/vnd.github+json';
      headers['X-GitHub-Api-Version'] = '2022-11-28';
      url = `https://api.github.com/repos/${connection.repository}/actions/runs/${action.runId}`;
      if (action.action === 'github.rerun') { url += '/rerun'; method = 'POST'; }
    } else if (connection.provider === 'cloudflare') {
      url = `https://api.cloudflare.com/client/v4/accounts/${connection.accountId}/workers/scripts/${connection.worker}/deployments`;
      if (action.action === 'cloudflare.deploy-version') {
        method = 'POST';
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ strategy: 'percentage', versions: [{ version_id: action.versionId, percentage: 100 }] });
      }
    } else { throw new Error('Unsupported action'); }
    const timeout = AbortSignal.timeout(15_000);
    const response = await transport(url, { method, headers, body, redirect: 'error', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    if (!response.ok || response.redirected) { await response.body?.cancel(); throw new Error('Provider rejected action'); }
    let result: ActionResult;
    if (action.action === 'github.rerun') {
      await response.body?.cancel();
      result = { action: action.action, runId: action.runId, status: 'requested' };
    } else {
      const data = await boundedJson(response);
      if (action.action === 'github.run-status') {
        const run = z.object({ status, conclusion }).parse(data);
        result = { action: action.action, runId: action.runId, ...run };
      } else if (action.action === 'cloudflare.deployments') {
        const envelope = z.object({ success: z.literal(true), result: z.object({ deployments: z.array(deployment).max(100) }) }).parse(data);
        result = { action: action.action, deployments: envelope.result.deployments.slice(0, 10) };
      } else {
        const envelope = z.object({ success: z.literal(true), result: z.object({ id: uuid }) }).parse(data);
        result = { action: action.action, deploymentId: envelope.result.id };
      }
    }
    if (JSON.stringify(result).includes(credential)) throw new Error('Sensitive response');
    return resultSchema.parse(result);
  } catch { throw new Error('Provider action failed; no provider response was released'); }
}
