import { McpServer, type CallToolResult } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { BrokerClient } from '../broker/client.js';

export function createAgentServer(brokerUrl?: string): McpServer {
  const client = new BrokerClient(brokerUrl);
  const server = new McpServer({ name: 'safegen', version: '3.1.0' });
  const result = async (action: () => Promise<unknown>): Promise<CallToolResult> => {
    try { return { content: [{ type: 'text', text: JSON.stringify(await action()) }] }; }
    catch { return { isError: true, content: [{ type: 'text', text: 'SafeGen request failed. Ask the owner to check the local broker.' }] }; }
  };
  server.registerTool('safegen_list_connections', {
    description: 'List configured account aliases and supported actions. No credentials are available to this client.',
    inputSchema: z.object({}).strict(),
  }, async () => result(() => client.connections()));
  server.registerTool('safegen_request_action', {
    description: 'Request one GitHub, Cloudflare, or npm action. The owner must approve the exact request in their separate local SafeGen control page. Returns only a pending request ID; never request passwords or control-page links.',
    inputSchema: z.object({
      connection: z.string().max(48),
      action: z.enum(['github.run-status', 'github.rerun', 'cloudflare.deployments', 'cloudflare.deploy-version', 'npm.view-latest', 'npm.publish-tarball']),
      runId: z.number().int().positive().optional(),
      versionId: z.string().uuid().optional(),
      tarballPath: z.string().optional(),
      version: z.string().optional(),
    }).strict(),
  }, async input => result(() => client.request(input)));
  server.registerTool('safegen_action_status', {
    description: 'Check a previously submitted request. Results contain only limited provider status fields. Denied, expired and revoked requests require a new request and fresh owner approval.',
    inputSchema: z.object({ requestId: z.string().uuid() }).strict(),
  }, async ({ requestId }) => result(() => client.status(requestId)));
  return server;
}

export function startMcpServer(brokerUrl?: string): void { serveStdio(() => createAgentServer(brokerUrl)); }
