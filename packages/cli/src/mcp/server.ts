import { acceptedContent, inputRequired, McpServer, type CallToolResult, type InputRequiredResult } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { accessLogPath, vaultPath } from '../paths.js';
import { VaultStore } from '../vault/store.js';
import { appendAccessLog } from './policy.js';
import { UnlockBroker } from './unlock-broker.js';

const inputSchema = z.object({ service: z.string().min(1), username: z.string().min(1).optional() });
const outputSchema = z.object({ credential: z.string(), service: z.string(), username: z.string() });

export async function startMcpServer(): Promise<void> {
  const store = new VaultStore(vaultPath());
  const broker = new UnlockBroker();
  let masterPassword: string | undefined;

  serveStdio(() => {
    const server = new McpServer({ name: 'safegen', version: '2.0.0' });
    server.registerTool('safegen_get_credential', {
      description: 'Request one credential from the encrypted local SafeGen vault. The user must unlock and approve every request.',
      inputSchema,
      outputSchema,
    }, async ({ service, username }, context): Promise<CallToolResult | InputRequiredResult> => {
      if (!masterPassword) {
        const unlockResponse = context.mcpReq.inputResponses?.unlock as { action?: string } | undefined;
        if (!unlockResponse) {
          const url = await broker.createUrl();
          return inputRequired({ inputRequests: { unlock: inputRequired.elicitUrl({ message: `Unlock the local SafeGen vault before accessing ${service}.`, url }) } });
        }
        if (unlockResponse.action !== 'accept') {
          await appendAccessLog(accessLogPath(), { service, username, approved: false });
          return { isError: true, content: [{ type: 'text', text: 'User denied credential access' }] };
        }
        masterPassword = broker.consumePassword();
        if (!masterPassword) return { isError: true, content: [{ type: 'text', text: 'The local vault was not unlocked' }] };
        try { await store.read(masterPassword); }
        catch (error) { masterPassword = undefined; return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unable to unlock vault' }] }; }
      }

      const approval = acceptedContent<{ approved: boolean }>(context.mcpReq.inputResponses, 'approval');
      if (!approval) {
        return inputRequired({ inputRequests: { approval: inputRequired.elicit({
          message: `Agent requests credential for ${service}${username ? ` (${username})` : ''}. Approve?`,
          requestedSchema: { type: 'object', properties: { approved: { type: 'boolean', title: 'Approve this credential request' } }, required: ['approved'] },
        }) } });
      }
      if (approval.approved !== true) {
        await appendAccessLog(accessLogPath(), { service, username, approved: false });
        return { isError: true, content: [{ type: 'text', text: 'User denied credential access' }] };
      }
      try {
        const entry = await store.get(service, username, masterPassword);
        await appendAccessLog(accessLogPath(), { service, username: entry.username, approved: true });
        const value = { credential: entry.credential, service: entry.service, username: entry.username };
        return { structuredContent: value, content: [{ type: 'text', text: JSON.stringify(value) }] };
      } catch (error) {
        await appendAccessLog(accessLogPath(), { service, username, approved: false });
        return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Credential request failed' }] };
      }
    });
    return server;
  });
}
