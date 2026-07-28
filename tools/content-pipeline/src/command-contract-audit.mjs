import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const COMMAND_KEYS = ['commandEnvelope', 'commandResult', 'commandError', 'domainErrors'];
const HANDWRITTEN_COMMAND_DECLARATIONS = [
  ['state version', /\bexport\s+(?:type|interface|class)\s+StateVersion\b/],
  ['command identifier', /\bexport\s+(?:type|interface|class)\s+CommandId\b/],
  ['command envelope', /\bexport\s+(?:type|interface|class)\s+CommandEnvelope\b/],
  ['command result', /\bexport\s+(?:type|interface|class)\s+CommandResult\b/],
  ['command error', /\bexport\s+(?:type|interface|class)\s+CommandError(?:Envelope)?\b/],
  ['domain error', /\bexport\s+(?:type|interface|class)\s+DomainError\b/],
  ['idempotency prose', /\bidempotenc\w*/i],
];

function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function gameFixturePaths(fixtureDir) {
  const negativeDir = resolve(fixtureDir, 'negative');
  const negativeNames = await readdir(negativeDir);
  return [
    resolve(fixtureDir, 'canonical-launch.json'),
    resolve(fixtureDir, 'canonical-d90.json'),
    ...negativeNames.filter((name) => name.endsWith('.json') && name !== 'public-odds-normalization.json' && !name.startsWith('command-')).map((name) => resolve(negativeDir, name)),
  ];
}

function extractTypescriptErrors(source) {
  const marker = 'export const generatedCommandDomainErrors = ';
  const line = source.split('\n').find((candidate) => candidate.startsWith(marker));
  if (!line) return [];
  return JSON.parse(line.slice(marker.length, line.lastIndexOf(' as const;')));
}

function extractCsharpErrors(source) {
  const match = source.match(/public enum DomainError \{ ([^}]+) \}/);
  return match ? match[1].split(',').map((value) => value.trim()) : [];
}

export async function auditCommandContractOwnership({ schemas, fixtureDir, root }) {
  const issues = [];
  const gameSchema = schemas['game.schema.json'];
  const commandSchema = schemas['command.schema.json'];
  const domainErrors = commandSchema?.$defs?.domainError?.enum ?? [];
  const contractsSource = await readFile(resolve(root, 'tools/content-pipeline/src/contracts.ts'), 'utf8');
  const handwrittenContractViolations = HANDWRITTEN_COMMAND_DECLARATIONS
    .filter(([, pattern]) => pattern.test(contractsSource))
    .map(([name]) => name);

  for (const name of handwrittenContractViolations) {
    issues.push(`contracts.ts contains handwritten ${name}`);
  }

  for (const key of COMMAND_KEYS) {
    if (gameSchema.required?.includes(key)) issues.push(`game schema requires ${key}`);
    if (Object.prototype.hasOwnProperty.call(gameSchema.properties ?? {}, key)) issues.push(`game schema defines ${key}`);
    if (Object.prototype.hasOwnProperty.call(gameSchema.$defs ?? {}, key)) issues.push(`game schema $defs duplicates ${key}`);
  }

  if (commandSchema?.$defs?.commandPayload?.properties?.kind?.const !== 'noop') issues.push('command payload is not kind=noop');
  if (Object.prototype.hasOwnProperty.call(commandSchema?.$defs?.commandPayload?.properties ?? {}, 'type')) issues.push('command payload defines divergent type discriminator');
  if (!domainErrors.includes('IdempotencyConflict')) issues.push('command schema omits IdempotencyConflict');
  if (typeof commandSchema?.$defs?.domainError?.description !== 'string') issues.push('domain error semantics are undocumented');

  const fixtureViolations = [];
  for (const filePath of await gameFixturePaths(fixtureDir)) {
    const fixture = JSON.parse(await readFile(filePath, 'utf8'));
    const duplicated = COMMAND_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(fixture, key));
    if (duplicated.length > 0) fixtureViolations.push({ filePath, duplicated });
  }
  if (fixtureViolations.length > 0) issues.push(`${fixtureViolations.length} game fixtures duplicate command contracts`);

  const generatedGameTs = await readFile(resolve(root, 'content/generated/typescript/content-models.ts'), 'utf8');
  const generatedGameCs = await readFile(resolve(root, 'content/generated/csharp/ContentModels.cs'), 'utf8');
  if (/GameCommand|commandEnvelope|commandResult|commandError|domainErrors/.test(generatedGameTs)) issues.push('generated TypeScript game models contain command contracts');
  if (/GameCommand|CommandEnvelope|CommandResult|CommandError|DomainError/.test(generatedGameCs)) issues.push('generated C# game models contain command contracts');

  let generatedCommandTs = '';
  let generatedCommandCs = '';
  try {
    generatedCommandTs = await readFile(resolve(root, 'content/generated/typescript/command-models.ts'), 'utf8');
    generatedCommandCs = await readFile(resolve(root, 'content/generated/csharp/CommandModels.cs'), 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    issues.push('generated command model artifacts are missing');
  }

  const typescriptErrors = generatedCommandTs ? extractTypescriptErrors(generatedCommandTs) : [];
  const csharpErrors = generatedCommandCs ? extractCsharpErrors(generatedCommandCs) : [];
  if (!sameValues(domainErrors, typescriptErrors)) issues.push('TypeScript DomainError diverges from command schema');
  if (!sameValues(domainErrors, csharpErrors)) issues.push('C# DomainError diverges from command schema');
  if (generatedCommandTs && !generatedCommandTs.includes("generatedCommandDefinitionSource = 'content/contracts/command.schema.json'")) issues.push('TypeScript command source provenance is missing');
  if (generatedCommandCs && !generatedCommandCs.includes('DefinitionSource = "content/contracts/command.schema.json"')) issues.push('C# command source provenance is missing');

  if (issues.length > 0) {
    const error = new Error(issues.join('; '));
    error.code = 'COMMAND_CONTRACT_DUPLICATION';
    error.payload = { issues, fixtureViolations, handwrittenContractViolations, schemaDomainErrors: domainErrors, typescriptErrors, csharpErrors };
    throw error;
  }

  return {
    canonicalSchema: 'content/contracts/command.schema.json',
    gameSchemaCommandKeys: [],
    fixtureViolations,
    handwrittenContractViolations,
    schemaDomainErrors: domainErrors,
    typescriptErrors,
    csharpErrors,
    noopDiscriminator: { field: 'kind', value: 'noop' },
  };
}
