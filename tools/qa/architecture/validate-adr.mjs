#!/usr/bin/env node
import { resolve } from 'node:path';
import { ContractError } from './contract-utils.mjs';
import { loadInput } from './load-input.mjs';
import { loadBoundReferences, validateCanonicalBindings, validateCanonicalProjections } from './validate-bindings.mjs';
import { validateAdrs } from './validate-adrs.mjs';
import { validateMatrix } from './validate-matrix.mjs';
import { validatePrerequisites } from './validate-prerequisites.mjs';
import { validateSourceClaims } from './validate-source-claims.mjs';

async function main() {
  const root = resolve(process.cwd());
  const [candidate] = process.argv.slice(2);
  const [input, references] = await Promise.all([loadInput(root, candidate), loadBoundReferences(root)]);
  await validateCanonicalBindings(root, input.matrix.canonicalBindings);
  validateCanonicalProjections(references);
  const sourceIds = validateMatrix(input.matrix, references);
  validateAdrs(input.matrix.adrRegistry, sourceIds, input.adrs);
  validateSourceClaims(input.sourceClaims);
  const blockers = await validatePrerequisites(root, input.prerequisites);
  console.log(JSON.stringify({ contractStatus: 'PASS', externalPrerequisiteStatus: blockers.length === 0 ? 'PASS' : 'BLOCKED', blockers }, null, 2));
  console.log('PASS');
}

main().catch((error) => {
  const issue = error instanceof ContractError ? error : { code: 'VALIDATOR_FAILURE', pointer: '', message: error instanceof Error ? error.message : String(error) };
  console.error(JSON.stringify(issue));
  process.exit(1);
});
