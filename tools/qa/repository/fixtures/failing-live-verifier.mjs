import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const verifierPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.cwd(), process.argv[1]) : '';

if (invokedPath === verifierPath) {
  process.stderr.write(`${JSON.stringify({ code: 'FIXTURE_LIVE_FAILURE', pointer: '/fixture', message: 'fixture-only live verifier failed intentionally' })}\n`);
  process.exitCode = 1;
} else {
  const originalSpawnSync = childProcess.spawnSync;
  childProcess.spawnSync = function spawnSyncWithFixture(command, args, options) {
    if (command === process.execPath && Array.isArray(args) && args.length === 1 && args[0] === 'tools/qa/repository/verify-repository.mjs') {
      return originalSpawnSync.call(this, command, [verifierPath], options);
    }
    return originalSpawnSync.apply(this, arguments);
  };
  syncBuiltinESMExports();
}
