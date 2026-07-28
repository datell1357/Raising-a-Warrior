#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { auditCommandContractOwnership } from './src/command-contract-audit.mjs';
import { loadContractSchemas } from './src/schema-engine.mjs';

const root = resolve(process.cwd());
const evidenceArg = process.argv.find((argument) => argument.startsWith('--red-evidence='));
const evidencePath = evidenceArg ? resolve(root, evidenceArg.split('=', 2)[1]) : null;

try {
  const schemas = await loadContractSchemas(resolve(root, 'content/contracts'));
  const proof = await auditCommandContractOwnership({ schemas, fixtureDir: resolve(root, 'tools/content-pipeline/fixtures'), root });
  console.log(JSON.stringify({ phase: 'GREEN', proof }, null, 2));
} catch (error) {
  const result = {
    phase: 'RED',
    command: 'node tools/content-pipeline/check-command-contract.mjs',
    exit_code: 1,
    code: error.code ?? 'COMMAND_CONTRACT_AUDIT_FAILURE',
    message: error.message,
    details: error.payload ?? null,
  };
  if (evidencePath) {
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  }
  console.error(JSON.stringify(result));
  process.exit(1);
}
