import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('Windows owner checker rejects each independent code-control permission', { skip: process.platform !== 'win32' }, () => {
  const script = fileURLToPath(new URL('../packages/cli/scripts/isolation-rights.ps1', import.meta.url));
  const source = `. '${script.replaceAll("'", "''")}'; foreach ($right in @('Write', 'Modify', 'ChangePermissions', 'TakeOwnership', 'Delete', 'DeleteSubdirectoriesAndFiles')) { if (-not (Test-SafeGenMutationRights ([Security.AccessControl.FileSystemRights]::$right))) { throw $right } }; if (Test-SafeGenMutationRights ([Security.AccessControl.FileSystemRights]::ReadAndExecute)) { throw 'Read should not be classified as mutation' }; Write-Output 'verified'`;
  const shell = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const result = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', source], { encoding: 'utf8', windowsHide: true, timeout: 15_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /verified/);
});
