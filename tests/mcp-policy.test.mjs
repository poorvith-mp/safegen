import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { startBroker } from '../packages/cli/dist/broker/server.js';

const cli = fileURLToPath(new URL('../packages/cli/dist/index.js', import.meta.url));

test('stdio MCP exposes action tools, rejects raw retrieval, and only submits pending requests', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'safegen-mcp-'));
  let credentialReads = 0;
  const broker = await startBroker({connections:[{id:'work',provider:'github',repository:'example/project'}],logPath:join(directory,'log'),vault:{read:async()=>({entries:[]}),get:async()=>{credentialReads++;throw new Error('must not read');}}});
  t.after(() => broker.close());
  const child = spawn(process.execPath, [cli,'mcp','--broker',broker.url], {stdio:['pipe','pipe','pipe']});
  t.after(() => child.kill());
  const reader = createInterface({input:child.stdout});
  t.after(() => reader.close());
  const pending = new Map();
  reader.on('line', line => { const message=JSON.parse(line); pending.get(message.id)?.(message); });
  let nextId=1;
  function call(method, params) {
    const id=nextId++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('MCP response timed out')),5000);
      pending.set(id,message=>{clearTimeout(timer);pending.delete(id);resolve(message);});
      child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',id,method,params})}\n`);
    });
  }
  const initialized=await call('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'safegen-test',version:'1'}});
  assert.ok(initialized.result, JSON.stringify(initialized));
  child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})}\n`);
  const listed=await call('tools/list',{});
  assert.deepEqual(listed.result.tools.map(tool=>tool.name).sort(),['safegen_action_status','safegen_list_connections','safegen_request_action']);
  const raw=await call('tools/call',{name:'safegen_get_credential',arguments:{service:'github.com'}});
  assert.ok(raw.error || raw.result?.isError);
  const submitted=await call('tools/call',{name:'safegen_request_action',arguments:{connection:'work',action:'github.run-status',runId:42}});
  assert.equal(JSON.parse(submitted.result.content[0].text).status,'pending');
  assert.equal(credentialReads,0);
  assert.doesNotMatch(JSON.stringify(submitted),/control\/|password|credential/);
});
