import { spawn } from 'node:child_process';
import { z } from 'zod';
import { readTarballInnerVersion, validateTarballPath } from './tarball.js';

const alias = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/);
const uuid = z.string().uuid();
const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export const connectionSchema = z.discriminatedUnion('provider', [
  z.object({ id: alias, provider: z.literal('github'), repository: z.string().regex(/^[a-zA-Z0-9_-]{1,100}\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,99}$/) }).strict(),
  z.object({ id: alias, provider: z.literal('cloudflare'), accountId: z.string().regex(/^[a-f0-9]{32}$/i), worker: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/) }).strict(),
  z.object({ id: alias, provider: z.literal('npm'), package: z.string().regex(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/), tarballDir: z.string().min(1) }).strict(),
]);
export type Connection = z.infer<typeof connectionSchema>;

export const actionSchema = z.discriminatedUnion('action', [
  z.object({ connection: alias, action: z.literal('github.run-status'), runId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict(),
  z.object({ connection: alias, action: z.literal('github.rerun'), runId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict(),
  z.object({ connection: alias, action: z.literal('cloudflare.deployments') }).strict(),
  z.object({ connection: alias, action: z.literal('cloudflare.deploy-version'), versionId: uuid }).strict(),
  z.object({ connection: alias, action: z.literal('npm.view-latest') }).strict(),
  z.object({ connection: alias, action: z.literal('npm.publish-tarball'), tarballPath: z.string().min(1), version: z.string().regex(semverRegex) }).strict(),
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
  z.object({ action: z.literal('npm.view-latest'), package: z.string(), latest: z.string().regex(semverRegex) }).strict(),
  z.object({ action: z.literal('npm.publish-tarball'), package: z.string(), version: z.string().regex(semverRegex), status: z.literal('published') }).strict(),
]);
export type ActionResult = z.infer<typeof resultSchema>;
export type Transport = typeof fetch;

export type CommandRunner = (
  command: string,
  args: string[],
  options: { env: Record<string, string>; timeout: number; signal?: AbortSignal }
) => Promise<{ exitCode: number }>;

export const defaultCommandRunner: CommandRunner = (command, args, options) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env,
      stdio: 'ignore',
      windowsHide: true,
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('publish failed'));
    }, options.timeout);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1 });
    });
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        child.kill('SIGTERM');
      }, { once: true });
    }
  });
};

export interface ExecuteActionOptions {
  transport?: Transport;
  signal?: AbortSignal;
  commandRunner?: CommandRunner;
  otp?: string;
}

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

export async function executeAction(
  connection: Connection,
  input: unknown,
  credential: string,
  transportOrOptions: Transport | ExecuteActionOptions = fetch,
  legacySignal?: AbortSignal
): Promise<ActionResult> {
  const options: ExecuteActionOptions = typeof transportOrOptions === 'function'
    ? { transport: transportOrOptions, signal: legacySignal }
    : transportOrOptions;
  const transport = options.transport ?? fetch;
  const signal = options.signal;
  const runner = options.commandRunner ?? defaultCommandRunner;

  try {
    const action = validateAction(connection, input);
    if (!credential || credential.length > 8_192 || /[\r\n]/.test(credential)) throw new Error('Invalid credential');
    const headers: Record<string, string> = { Authorization: `Bearer ${credential}`, 'User-Agent': 'SafeGen/3.0', Accept: 'application/json' };
    let result: ActionResult;

    if (connection.provider === 'npm' && action.action === 'npm.publish-tarball') {
      const resolvedTarball = validateTarballPath(connection.tarballDir, action.tarballPath);
      const innerVersion = await readTarballInnerVersion(resolvedTarball);
      if (innerVersion !== action.version) {
        throw new Error('version mismatch');
      }
      if (!options.otp || !/^\d{6}$/.test(options.otp)) {
        throw new Error('publish failed');
      }
      const execResult = await runner('npm', ['publish', resolvedTarball, '--access', 'public', '--otp', options.otp], {
        env: { ...process.env, NODE_AUTH_TOKEN: credential, NPM_TOKEN: credential, npm_config__auth: credential },
        timeout: 120_000,
        signal,
      });
      if (execResult.exitCode !== 0) {
        throw new Error('publish failed');
      }
      result = { action: 'npm.publish-tarball', package: connection.package, version: action.version, status: 'published' };
    } else {
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
      } else if (connection.provider === 'npm' && action.action === 'npm.view-latest') {
        const encodedPkg = connection.package.startsWith('@')
          ? `@${encodeURIComponent(connection.package.slice(1))}`
          : encodeURIComponent(connection.package);
        url = `https://registry.npmjs.org/${encodedPkg}`;
      } else {
        throw new Error('Unsupported action');
      }

      const timeout = AbortSignal.timeout(15_000);
      const response = await transport(url, { method, headers, body, redirect: 'error', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      if (!response.ok || response.redirected) { await response.body?.cancel(); throw new Error('Provider rejected action'); }

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
        } else if (action.action === 'cloudflare.deploy-version') {
          const envelope = z.object({ success: z.literal(true), result: z.object({ id: uuid }) }).parse(data);
          result = { action: action.action, deploymentId: envelope.result.id };
        } else if (connection.provider === 'npm' && action.action === 'npm.view-latest') {
          const envelope = z.object({ 'dist-tags': z.object({ latest: z.string().regex(semverRegex) }) }).passthrough().parse(data);
          result = { action: 'npm.view-latest', package: connection.package, latest: envelope['dist-tags'].latest };
        } else {
          throw new Error('Unsupported action');
        }
      }
    }

    if (JSON.stringify(result).includes(credential)) throw new Error('Sensitive response');
    return resultSchema.parse(result);
  } catch (error) {
    if (error instanceof Error && ['tarball not allowed', 'version mismatch', 'publish failed'].includes(error.message)) {
      throw error;
    }
    throw new Error('Provider action failed; no provider response was released');
  }
}
