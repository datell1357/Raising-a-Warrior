#!/usr/bin/env node
import { ContractError } from './contract-utils.mjs';
import { validateCandidate } from './candidate-validator.mjs';

async function readStandardInput() {
  let source = '';
  for await (const chunk of process.stdin) source += chunk;
  return source;
}

function writeIssue(code, pointer, message) {
  process.stderr.write(`${JSON.stringify({ code, pointer, message })}\n`);
}

async function main() {
  const source = await readStandardInput();
  let candidate;
  try {
    candidate = JSON.parse(source);
  } catch (error) {
    writeIssue('CANDIDATE_INVALID_JSON', '', error instanceof Error ? error.message : 'candidate JSON could not be parsed');
    process.exitCode = 1;
    return;
  }
  try {
    validateCandidate(candidate);
  } catch (error) {
    if (error instanceof ContractError) {
      writeIssue(error.code, error.pointer, error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
  process.stdout.write('PASS\n');
}

main().catch((error) => {
  writeIssue('VALIDATOR_FAILURE', '', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
