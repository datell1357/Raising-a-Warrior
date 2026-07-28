import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';
import { fail } from './contract-utils.mjs';
import { assertSafePath, repositoryPath } from './path-safety.mjs';

const ignored = new Set(['.codegraph', '.git', '.omo', 'node_modules', 'dist', 'coverage', '.cache', '.tmp', '.pytest_cache', '.ruff_cache']);
const textExtensions = new Set(['.cjs', '.cs', '.css', '.env', '.html', '.json', '.js', '.key', '.md', '.mjs', '.pem', '.rules', '.ts', '.tsx', '.txt', '.yml', '.yaml']);
const forbiddenBinarySecretSuffixes = ['.p12', '.jks', '.keystore'];
const projects = ['tools/content-pipeline', 'backend/functions', 'web/account', 'web/ops'];
const packages = ['backend/functions', 'web/account', 'web/ops'];

function pointer(path) { return `/${path}`; }

export function isTextInventoryPath(path) {
  const basename = path.slice(path.lastIndexOf('/') + 1);
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase();
  return textExtensions.has(extension) || path.startsWith('.env') || basename === 'Dockerfile' || basename.startsWith('Dockerfile.') || ['.tf', '.sh', '.bash', '.zsh', '.toml', '.gradle', '.properties'].includes(extension);
}

export function isForbiddenBinarySecretPath(path) {
  const lowerPath = path.toLowerCase();
  return forbiddenBinarySecretSuffixes.some((suffix) => lowerPath.endsWith(suffix));
}

async function readJson(root, path) {
  const absolute = repositoryPath(root, path, pointer(path));
  await assertSafePath(root, absolute, pointer(path), true);
  let source;
  try { source = await readFile(absolute, 'utf8'); }
  catch (error) { fail('REQUIRED_FILE_MISSING', pointer(path), error instanceof Error ? error.message : 'required file is missing'); }
  try { return JSON.parse(source); }
  catch (error) { fail('REPOSITORY_JSON_INVALID', pointer(path), error instanceof Error ? error.message : 'invalid JSON'); }
}

async function readText(root, path) {
  const absolute = repositoryPath(root, path, pointer(path));
  await assertSafePath(root, absolute, pointer(path), true);
  return readFile(absolute, 'utf8');
}

async function walk(root, directory = '') {
  const absolute = repositoryPath(root, directory || '.', pointer(directory));
  await assertSafePath(root, absolute, pointer(directory));
  const entries = await readdir(absolute, { withFileTypes: true });
  const paths = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (ignored.has(entry.name)) continue;
    if (entry.isSymbolicLink()) fail('SYMLINK_FORBIDDEN', pointer(path), 'repository inventory must not include symlinks');
    if (entry.isDirectory()) paths.push(...await walk(root, path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths;
}

async function textInventory(root, allPaths) {
  const files = {};
  for (const path of allPaths) {
    if (path.startsWith('tools/qa/repository/fixtures/')) continue;
    if (isForbiddenBinarySecretPath(path)) continue;
    if (!isTextInventoryPath(path)) continue;
    const data = await readFile(repositoryPath(root, path, pointer(path)));
    if (!data.includes(0)) files[path] = { content: data.toString('utf8') };
  }
  return files;
}

function yaml(root, path, source) {
  const document = parseDocument(source, { uniqueKeys: true, schema: 'json' });
  if (document.errors.length > 0) fail('YAML_INVALID', pointer(path), document.errors[0].message);
  return document.toJS();
}

async function loadByPath(root, paths, suffix) {
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await readJson(root, `${path}/${suffix}`)])));
}

export async function buildRepositoryModel(root) {
  const allPaths = await walk(root);
  const [repositoryFiles, rootTsconfig, baseTsconfig, environmentSchema, environments, workspacePackages, lockfile, workflowSources, firestoreRules, firestoreIndexes, provenanceSchema, signatureSchema] = await Promise.all([
    textInventory(root, allPaths), readJson(root, 'tsconfig.json'), readJson(root, 'tsconfig.base.json'), readJson(root, 'release/environments/environment.schema.json'),
    Promise.all(['dev', 'stage', 'prod'].map(async (id) => [id, await readJson(root, `release/environments/${id}.json`)])), loadByPath(root, packages, 'package.json'), readText(root, 'bun.lock'),
    Promise.all(['client.yml', 'backend.yml', 'content.yml', 'security.yml', 'release.yml'].map(async (name) => {
      const path = `.github/workflows/${name}`;
      return allPaths.includes(path) ? [name, yaml(root, path, await readText(root, path))] : [name, null];
    })),
    readText(root, 'backend/firestore.rules'), readJson(root, 'backend/firestore.indexes.json'), readJson(root, 'release/provenance/provenance.schema.json'), readJson(root, 'release/provenance/signature.schema.json'),
  ]);
  const environmentDocuments = Object.fromEntries(environments);
  const [repositoryContract, asmdefPolicy, provenance, prerequisites, packageManifest, configRefs, projectConfigs] = await Promise.all([
    readJson(root, 'release/repository-contract.json'), readJson(root, 'client/WarriorRaising/asmdef-policy.json'), readJson(root, 'release/provenance/contract.json'),
    readJson(root, 'docs/operations/external-prerequisites.json'), readJson(root, 'package.json'), readJson(root, 'backend/functions/config.refs.json'), loadByPath(root, projects, 'tsconfig.json'),
  ]);
  const workflows = Object.fromEntries(workflowSources);
  return {
    files: repositoryFiles, assemblies: Object.fromEntries((asmdefPolicy.assemblies ?? []).map((item) => [`Warrior.${item.name}`, { references: (item.references ?? []).map((name) => `Warrior.${name}`) }])),
    environments: Object.fromEntries(Object.entries(environmentDocuments).map(([id, value]) => [id, { parameterRefs: { apiBaseUrl: value.parameterRefs?.runtimeConfiguration ?? '' } }])),
    typescript: { projects: projectConfigs }, lockfile: { packageManager: 'bun', integrity: `sha256:${createHash('sha256').update(lockfile).digest('hex')}` }, provenance,
    allPaths, repositoryFiles, rootTsconfig, baseTsconfig, environmentSchema, environmentDocuments, workspacePackages, packageManifest, lockfile: { packageManager: 'bun', integrity: `sha256:${createHash('sha256').update(lockfile).digest('hex')}`, content: lockfile, document: yaml(root, 'bun.lock', lockfile) }, repositoryContract, asmdefPolicy, externalPrerequisites: prerequisites, configRefs, workflows, firestore: { rules: firestoreRules, indexes: firestoreIndexes }, provenanceSchema, signatureSchema,
  };
}
