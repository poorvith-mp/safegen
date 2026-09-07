import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Remove only these known generated outputs; tsc otherwise leaves deleted modules in npm packages.
for (const relative of ['../packages/core/dist/', '../packages/cli/dist/']) {
  rmSync(fileURLToPath(new URL(relative, import.meta.url)), { recursive: true, force: true });
}
