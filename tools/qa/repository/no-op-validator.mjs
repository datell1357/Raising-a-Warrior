#!/usr/bin/env node
async function readStandardInput() {
  let content = '';
  for await (const chunk of process.stdin) content += chunk;
  return content;
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
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    writeIssue('CANDIDATE_OBJECT_REQUIRED', '', 'candidate must be a JSON object');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('PASS\n');
}

main().catch((error) => {
  writeIssue('VALIDATOR_FAILURE', '', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
