import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';
import { fail } from './contract-utils.mjs';
import { assertSafePath, repositoryPath } from './path-safety.mjs';

const ignored = new Set(['.codegraph', '.git', '.omo', 'node_modules', 'Library', 'Temp', 'dist', 'coverage', '.cache', '.tmp', '.pytest_cache', '.ruff_cache']);
const textExtensions = new Set(['.asmdef', '.asmref', '.asset', '.cjs', '.cs', '.css', '.env', '.html', '.json', '.js', '.key', '.md', '.mjs', '.pem', '.rules', '.ts', '.tsx', '.txt', '.unity', '.yml', '.yaml']);
const forbiddenBinarySecretSuffixes = ['.p12', '.jks', '.keystore'];
const projects = ['tools/content-pipeline', 'backend/functions', 'web/account', 'web/ops'];
const packages = ['backend/functions', 'web/account', 'web/ops'];
const unityRoot = 'client/WarriorRaising/';
const asmdefFields = new Set(['name', 'rootNamespace', 'references', 'includePlatforms', 'excludePlatforms', 'allowUnsafeCode', 'overrideReferences', 'precompiledReferences', 'autoReferenced', 'defineConstraints', 'versionDefines', 'noEngineReferences', 'optionalUnityReferences']);

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

export function shouldIgnoreRepositoryPath(path) {
  const basename = path.slice(path.lastIndexOf('/') + 1);
  if (path.startsWith(`${unityRoot}android/build/`) && basename.endsWith('_BackUpThisFolder_ButDontShipItWithYourGame')) return true;
  return ignored.has(basename) && !path.startsWith(`${unityRoot}Assets/`) && !path.startsWith(`${unityRoot}Packages/`) && !path.startsWith(`${unityRoot}ProjectSettings/`);
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
    if (entry.isSymbolicLink()) fail('SYMLINK_FORBIDDEN', pointer(path), 'repository inventory must not include symlinks');
    if (shouldIgnoreRepositoryPath(path)) continue;
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

function artifactPointer(path) { return `/${path}`; }

function parseJsonArtifact(files, path) {
  const source = files[path];
  if (source === undefined) return null;
  try { return JSON.parse(source); }
  catch (error) { fail('UNITY_ARTIFACT_INVALID_JSON', artifactPointer(path), error instanceof Error ? error.message : 'Unity artifact JSON is invalid'); }
}

function yamlValue(source, keys) {
  for (const key of keys) {
    const match = new RegExp(`^[ \\t]*${key}:[ \\t]*([^\\r\\n]+)[ \\t]*$`, 'm').exec(source);
    if (match) return match[1];
  }
  return null;
}

function yamlMapValue(source, key, target) {
  const map = new RegExp(`^([ \\t]*)${key}:[ \\t]*\\r?\\n`, 'gm');
  for (let match = map.exec(source); match; match = map.exec(source)) {
    const rootIndent = match[1].length;
    for (const line of source.slice(map.lastIndex).split(/\r?\n/)) {
      const entry = /^([ \t]*)([^:\r\n]+):[ \t]*([^\r\n]+)[ \t]*$/.exec(line);
      if (!entry || entry[1].length <= rootIndent) break;
      if (entry[2] === target) return entry[3];
    }
  }
  return null;
}

function asmdefArray(value, path, field) {
  if (!Array.isArray(value)) fail('UNITY_ASMDEF_INVALID', `${artifactPointer(path)}/${field}`, `${field} must be an array`);
  return value;
}

function asmdefBoolean(value, path, field) {
  if (typeof value !== 'boolean') fail('UNITY_ASMDEF_INVALID', `${artifactPointer(path)}/${field}`, `${field} must be a boolean`);
  return value;
}

export function parseUnityArtifactFiles(files) {
  const asmdefs = Object.keys(files).filter((path) => path.endsWith('.asmdef')).sort().map((path) => {
    const value = parseJsonArtifact(files, path);
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('UNITY_ASMDEF_INVALID', artifactPointer(path), 'asmdef must be an object');
    const extra = Object.keys(value).find((key) => !asmdefFields.has(key));
    if (extra) fail('UNITY_ASMDEF_UNSUPPORTED_FIELD', `${artifactPointer(path)}/${extra}`, 'asmdef contains an unsupported behavior-changing field');
    if (typeof value.name !== 'string' || typeof value.rootNamespace !== 'string') fail('UNITY_ASMDEF_INVALID', artifactPointer(path), 'asmdef name and rootNamespace must be strings');
    return {
      path, name: value.name, rootNamespace: value.rootNamespace,
      references: asmdefArray(value.references, path, 'references'), includePlatforms: asmdefArray(value.includePlatforms, path, 'includePlatforms'), excludePlatforms: asmdefArray(value.excludePlatforms, path, 'excludePlatforms'),
      allowUnsafeCode: asmdefBoolean(value.allowUnsafeCode, path, 'allowUnsafeCode'), overrideReferences: asmdefBoolean(value.overrideReferences, path, 'overrideReferences'), precompiledReferences: asmdefArray(value.precompiledReferences, path, 'precompiledReferences'), autoReferenced: asmdefBoolean(value.autoReferenced, path, 'autoReferenced'), defineConstraints: asmdefArray(value.defineConstraints, path, 'defineConstraints'), versionDefines: asmdefArray(value.versionDefines, path, 'versionDefines'), noEngineReferences: asmdefBoolean(value.noEngineReferences, path, 'noEngineReferences'), optionalUnityReferences: asmdefArray(value.optionalUnityReferences ?? [], path, 'optionalUnityReferences'),
    };
  });
  const projectSettings = files['ProjectSettings/ProjectSettings.asset'] ?? '';
  const manifest = parseJsonArtifact(files, 'Packages/manifest.json');
  const lock = parseJsonArtifact(files, 'Packages/packages-lock.json');
  const pad = parseJsonArtifact(files, 'android/pad/manifest.json');
  const output = parseJsonArtifact(files, 'android/build/output.json');
  const symbols = parseJsonArtifact(files, 'android/build/symbols.json');
  const buildEvidenceReady = output !== null && typeof output === 'object' && !Array.isArray(output) && symbols !== null && typeof symbols === 'object' && !Array.isArray(symbols);
  return {
    files,
    asmdefs,
    asmrefs: Object.keys(files).filter((path) => path.endsWith('.asmref')).sort(),
    projectVersion: /^m_EditorVersion:\s*(.+?)\s*$/m.exec(files['ProjectSettings/ProjectVersion.txt'] ?? '')?.[1] ?? null,
    manifest,
    lock,
    android: {
      targetApi: yamlValue(projectSettings, ['AndroidTargetSdkVersion']),
      architectures: yamlValue(projectSettings, ['AndroidTargetArchitectures']),
      scriptingBackend: yamlValue(projectSettings, ['AndroidScriptingBackend', 'ScriptingBackend']) ?? yamlMapValue(projectSettings, 'scriptingBackend', 'Android'),
      ios: yamlValue(projectSettings, ['iOS']),
    },
    scenes: Object.keys(files).filter((path) => path.endsWith('.unity') && !/^Assets\/InitTestScene[0-9a-f-]+\.unity$/.test(path)).sort(),
    addressables: files['Assets/AddressableAssetsData/AddressableAssetSettings.asset'] ?? null,
    pad,
    output,
    symbols,
    buildEvidenceReady,
  };
}

async function unityProject(root, allPaths) {
  const prefix = unityRoot;
  const paths = allPaths.filter((path) => path.startsWith(prefix) && /^(?:client\/WarriorRaising\/)?(?:Assets|Packages|ProjectSettings|android)\//.test(path));
  if (paths.length === 0) return null;
  const files = Object.fromEntries(await Promise.all(paths.map(async (path) => [path.slice(prefix.length), await readText(root, path)])));
  const required = ['ProjectSettings/ProjectVersion.txt', 'Packages/manifest.json', 'Packages/packages-lock.json', 'ProjectSettings/ProjectSettings.asset', 'Assets/AddressableAssetsData/AddressableAssetSettings.asset', 'android/pad/manifest.json'];
  return { ...parseUnityArtifactFiles(files), ready: required.every((path) => Object.hasOwn(files, path)) };
}

export async function buildRepositoryModel(root) {
  const allPaths = await walk(root);
  const [repositoryFiles, rootTsconfig, baseTsconfig, environmentSchema, environments, workspacePackages, lockfile, workflowSources, firestoreRules, firestoreIndexes, provenanceSchema, signatureSchema, firebaseConfig, firebaseAliases, runtimePolicySource, callableSource] = await Promise.all([
    textInventory(root, allPaths), readJson(root, 'tsconfig.json'), readJson(root, 'tsconfig.base.json'), readJson(root, 'release/environments/environment.schema.json'),
    Promise.all(['dev', 'stage', 'prod'].map(async (id) => [id, await readJson(root, `release/environments/${id}.json`)])), loadByPath(root, packages, 'package.json'), readText(root, 'bun.lock'),
    Promise.all(['client.yml', 'backend.yml', 'content.yml', 'security.yml', 'release.yml'].map(async (name) => {
      const path = `.github/workflows/${name}`;
      return allPaths.includes(path) ? [name, yaml(root, path, await readText(root, path))] : [name, null];
    })),
    readText(root, 'backend/firestore.rules'), readJson(root, 'backend/firestore.indexes.json'), readJson(root, 'release/provenance/provenance.schema.json'), readJson(root, 'release/provenance/signature.schema.json'),
    readJson(root, 'firebase.json'), readJson(root, '.firebaserc'), readText(root, 'backend/functions/src/runtime-policy.ts'), readText(root, 'backend/functions/src/index.ts'),
  ]);
  const environmentDocuments = Object.fromEntries(environments);
  const [repositoryContract, asmdefPolicy, provenance, prerequisites, packageManifest, configRefs, projectConfigs, unity] = await Promise.all([
    readJson(root, 'release/repository-contract.json'), readJson(root, 'client/WarriorRaising/asmdef-policy.json'), readJson(root, 'release/provenance/contract.json'),
    readJson(root, 'docs/operations/external-prerequisites.json'), readJson(root, 'package.json'), readJson(root, 'backend/functions/config.refs.json'), loadByPath(root, projects, 'tsconfig.json'), unityProject(root, allPaths),
  ]);
  const workflows = Object.fromEntries(workflowSources);
  return {
    files: repositoryFiles, assemblies: Object.fromEntries((asmdefPolicy.assemblies ?? []).map((item) => [`Warrior.${item.name}`, { references: (item.references ?? []).map((name) => `Warrior.${name}`) }])),
    environments: Object.fromEntries(Object.entries(environmentDocuments).map(([id, value]) => [id, { parameterRefs: { apiBaseUrl: value.parameterRefs?.runtimeConfiguration ?? '' } }])),
    typescript: { projects: projectConfigs }, lockfile: { packageManager: 'bun', integrity: `sha256:${createHash('sha256').update(lockfile).digest('hex')}` }, provenance,
    allPaths, repositoryFiles, rootTsconfig, baseTsconfig, environmentSchema, environmentDocuments, workspacePackages, packageManifest, lockfile: { packageManager: 'bun', integrity: `sha256:${createHash('sha256').update(lockfile).digest('hex')}`, content: lockfile, document: yaml(root, 'bun.lock', lockfile) }, repositoryContract, asmdefPolicy, externalPrerequisites: prerequisites, configRefs, workflows, firestore: { rules: firestoreRules, indexes: firestoreIndexes }, provenanceSchema, signatureSchema, firebaseConfig, firebaseAliases, runtimePolicySource, callableSource, unity,
  };
}
