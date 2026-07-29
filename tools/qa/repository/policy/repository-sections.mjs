import { createHash } from 'node:crypto';
import { array, exactKeys, fail, object } from '../contract-utils.mjs';
import { isForbiddenBinarySecretPath } from '../repository-model.mjs';
import { projects, workflows, parameterKeys, repositoryContractSha256, lockfilePolicyContract, validationCommandsContract, regularExpressionPrefixKinds, baseOptions, asmdefDefaults, asmdefRules, T6_UNITY_CONTRACT, canonicalAssemblies, environmentSchemaContract, provenanceSchemaContract, signatureSchemaContract, environmentMappings } from './contracts.mjs';
import { canonicalize, childPointer, equal, firstDifference, pointer } from './shared.mjs';
import { validateUnityPolicyDeclaration, validateUnityProject } from './unity.mjs';

export function repositoryContract(model) {
  const contract = object(model.repositoryContract, '/repositoryContract');
  if (!equal(contract.lockfilePolicy, lockfilePolicyContract)) fail('REPOSITORY_CONTRACT_LOCKFILE_POLICY_INVALID', '/repositoryContract/lockfilePolicy', 'repository lockfile policy must be exact');
  if (!equal(contract.validationCommands, validationCommandsContract)) fail('REPOSITORY_CONTRACT_VALIDATION_COMMANDS_INVALID', '/repositoryContract/validationCommands', 'repository validation commands must be exact');
  const digest = createHash('sha256').update(JSON.stringify(canonicalize(contract))).digest('hex');
  if (digest !== repositoryContractSha256) fail('REPOSITORY_CONTRACT_INVALID', '/repositoryContract', 'repository contract must be canonical');
}

export function binarySecretContainers(model) {
  const paths = [...new Set([...model.allPaths, ...Object.keys(model.repositoryFiles)])].sort();
  const forbidden = paths.find(isForbiddenBinarySecretPath);
  if (forbidden) fail('BINARY_SIGNING_CONTAINER_FORBIDDEN', pointer(forbidden), 'binary signing containers are forbidden');
}


export function required(model) {
  const contract = object(model.repositoryContract, '/repositoryContract');
  for (const path of array(contract.requiredT5Roots, '/repositoryContract/requiredT5Roots')) if (!model.allPaths.some((item) => item.startsWith(`${path}/`))) fail('REQUIRED_ROOT_MISSING', pointer(path), 'required T5 root is missing');
  for (const path of array(contract.requiredT5Files, '/repositoryContract/requiredT5Files')) if (!model.allPaths.includes(path)) fail('REQUIRED_FILE_MISSING', pointer(path), 'required T5 file is missing');
}

export function typescript(model) {
  if (!equal(object(model.rootTsconfig, '/tsconfig.json').references, projects.map((path) => ({ path: `./${path}` })))) fail('TS_ROOT_REFERENCES_INVALID', '/tsconfig.json/references', 'root TypeScript references must be exact and ordered');
  if (!equal(object(model.rootTsconfig, '/tsconfig.json').files, [])) fail('TS_ROOT_FILES_INVALID', '/tsconfig.json/files', 'root TypeScript project must have no files');
  if (!equal(object(model.baseTsconfig, '/tsconfig.base.json').compilerOptions, baseOptions)) fail('TS_BASE_STRICT_INVALID', '/tsconfig.base.json/compilerOptions', 'base TypeScript strict policy must be exact');
  for (const path of projects) {
    const config = object(model.typescript.projects[path], `/typescript/projects/${path}`);
    if (config.extends !== '../../tsconfig.base.json' || !equal(config.include, ['src/**/*.ts'])) fail('TS_PROJECT_INVALID', `/typescript/projects/${path}`, 'project shape must be exact');
    const options = object(config.compilerOptions, `/typescript/projects/${path}/compilerOptions`);
    if (options.composite !== true || options.strict !== true || options.rootDir !== './src' || options.outDir !== './dist' || options.tsBuildInfoFile !== './dist/tsconfig.tsbuildinfo') fail('TS_PROJECT_OPTIONS_INVALID', `/typescript/projects/${path}/compilerOptions`, 'project options must not relax strict policy');
  }
  const configs = model.allPaths.filter((path) => path.endsWith('tsconfig.json') && path !== 'tsconfig.json');
  for (const path of configs) if (!projects.some((project) => path === `${project}/tsconfig.json`)) fail('TS_ORPHAN_PROJECT', pointer(path), 'only declared TypeScript projects are allowed');
}


export function asmdefs(model) {
  validateUnityPolicyDeclaration(model.asmdefPolicy);
  if (model.unity?.ready) validateUnityProject(model.unity);
}

export function environments(model) {
  const docs = object(model.environmentDocuments, '/environmentDocuments');
  const schema = object(model.environmentSchema, '/environmentSchema');
  if (schema.title !== environmentSchemaContract.title) fail('ENVIRONMENT_SCHEMA_CONTRACT_INVALID', '/environmentSchema', 'environment schema contract must be exact');
  const schemaDifference = firstDifference(schema, environmentSchemaContract, '/environmentSchema');
  if (schemaDifference) fail('ENVIRONMENT_SCHEMA_CONTRACT_INVALID', schemaDifference, 'environment schema contract must be exact');
  const prereqs = new Set(array(object(model.externalPrerequisites, '/externalPrerequisites').prerequisites, '/externalPrerequisites/prerequisites').map((entry) => entry.id));
  for (const id of ['dev', 'stage', 'prod']) {
    const env = object(docs[id], `/environmentDocuments/${id}`);
    const mapping = environmentMappings[id];
    const expected = ['$schema', 'schemaVersion', 'environmentId', 'androidApplicationRef', 'targetApi', 'androidAbi', 'firebasePrerequisiteRef', 'serviceIdentityPrerequisiteRef', 'appCheckPrerequisiteRef', 'contentVersionRef', 'releaseTrack', 'parameterRefs', 'secretRefs', 'externalPrerequisiteRefs'];
    exactKeys(env, expected, `/environmentDocuments/${id}`);
    if (env.targetApi !== 36) fail('ENVIRONMENT_TARGET_API_INVALID', `/environmentDocuments/${id}/targetApi`, 'target API must be 36');
    if (env.releaseTrack !== mapping.track) fail('ENVIRONMENT_RELEASE_TRACK_INVALID', `/environmentDocuments/${id}/releaseTrack`, 'release track must match environment');
    if (env.environmentId !== id || env.$schema !== 'environment.schema.json' || env.schemaVersion !== 'warrior-release-environment/v1' || env.androidApplicationRef !== 'prerequisite:android-package-name' || env.androidAbi !== 'arm64-v8a' || env.contentVersionRef !== 'parameter:content-version' || !equal(Object.keys(object(env.parameterRefs, '')).sort(), parameterKeys)) fail('ENVIRONMENT_SCHEMA_INVALID', `/environmentDocuments/${id}`, 'environment instance keys must be exact');
    if (!equal(env.secretRefs, { functionRuntime: 'defineSecret:function-runtime' })) fail('ENVIRONMENT_SECRET_REFERENCE_INVALID', `/environmentDocuments/${id}/secretRefs`, 'secret references must be exact');
    for (const value of Object.values(env.parameterRefs)) if (typeof value !== 'string' || !value.startsWith('parameter:') || /(?:dev|test|debug|emulator)/i.test(value)) fail('ENVIRONMENT_PARAMETER_REFERENCE_INVALID', `/environmentDocuments/${id}/parameterRefs`, 'parameter references must be non-secret production-safe references');
    for (const [key, value] of Object.entries(env)) if (key.endsWith('PrerequisiteRef') && value !== null && (!String(value).startsWith('prerequisite:') || !prereqs.has(String(value).slice('prerequisite:'.length)))) fail('PREREQUISITE_UNRESOLVED', `/environmentDocuments/${id}/${key}`, 'prerequisite reference must resolve');
    for (const value of Object.values(env.externalPrerequisiteRefs)) if (value !== null && !prereqs.has(String(value).slice('prerequisite:'.length))) fail('PREREQUISITE_UNRESOLVED', `/environmentDocuments/${id}/externalPrerequisiteRefs`, 'external prerequisite must resolve');
    if (env.firebasePrerequisiteRef !== mapping.firebase || env.serviceIdentityPrerequisiteRef !== 'prerequisite:firebase-service-identities') fail('ENVIRONMENT_PREREQUISITE_INVALID', `/environmentDocuments/${id}`, 'environment prerequisite references must be exact');
    if (env.appCheckPrerequisiteRef !== mapping.appCheck) fail('ENVIRONMENT_PREREQUISITE_INVALID', `/environmentDocuments/${id}/appCheckPrerequisiteRef`, 'App Check scope must be exact');
    if (!equal(env.externalPrerequisiteRefs, mapping.external)) fail('ENVIRONMENT_EXTERNAL_SCOPE_INVALID', `/environmentDocuments/${id}/externalPrerequisiteRefs`, 'external prerequisite scope must be exact');
  }
  if (!equal(model.configRefs.parameterRefs, docs.prod.parameterRefs) || !equal(model.configRefs.secretRefs, docs.prod.secretRefs) || !equal(model.configRefs.prerequisiteRefs, ['firebase-dev-project', 'firebase-stage-project', 'firebase-prod-project', 'firebase-service-identities', 'app-check-play-integrity'])) fail('BACKEND_CONFIG_REFS_INVALID', '/configRefs', 'backend references must match release contracts');
  for (const [path, file] of Object.entries(model.repositoryFiles)) if (/functions\.config\s*\(/.test(file.content) || /(^|\/)\.env(?:\.|$)/.test(path)) fail('FUNCTIONS_CONFIG_FORBIDDEN', pointer(path), 'runtime config APIs and committed env files are forbidden');
}

export function firestore(model) {
  const value = object(model.firestore, '/firestore');
  const rules = typeof value.rules === 'string' ? value.rules.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '').replace(/\s+/g, '') : '';
  const indexes = value.indexes;
  if (!indexes || typeof indexes !== 'object' || Array.isArray(indexes) || !equal(Object.keys(indexes).sort(), ['fieldOverrides', 'indexes']) || !equal(indexes.indexes, []) || !equal(indexes.fieldOverrides, [])) fail('FIRESTORE_INDEXES_NONEMPTY', '/firestore/indexes', 'Firestore indexes must be empty');
  if (rules.includes("allowread,write:iftrue") || !rules.includes("authoritySnapshots") || !rules.includes("publicSnapshots") || !rules.includes("commandLedger") || !rules.includes("allowget:iftrue") || !rules.includes("allowlist,create,update,delete:iffalse")) fail('FIRESTORE_RULES_PERMISSIVE', '/firestore/rules', 'Firestore rules must be the T7 owner/public/server-only contract');
}

export function packages(model) {
  const manifest = object(model.packageManifest, '/packageManifest');
  if (manifest.packageManager !== 'bun@1.3.14' || !equal(manifest.workspaces, ['backend/functions', 'web/account', 'web/ops']) || !equal(manifest.devDependencies, { 'firebase-tools': '15.24.0', node: '22.18.0', typescript: '7.0.2', yaml: '2.9.0' })) fail('PACKAGE_MANIFEST_DRIFT', '/package.json', 'root package contract must be exact');
  const lock = object(model.lockfile.document, '/bun.lock');
  if (!equal(lock.workspaces?.['']?.devDependencies, { 'firebase-tools': '15.24.0', node: '22.18.0', typescript: '7.0.2', yaml: '2.9.0' }) || !lock.packages?.['firebase-tools'] || !lock.packages?.node || !lock.packages?.typescript || !lock.packages?.yaml) fail('LOCKFILE_DRIFT', '/bun.lock', 'root dependencies must be locked exactly');
  for (const [path, workspace] of Object.entries(object(lock.workspaces, '/bun.lock/workspaces'))) {
    if (path && !manifest.workspaces.includes(path)) fail('LOCKFILE_DRIFT', '/bun.lock/workspaces', 'lockfile has an undeclared workspace');
    if (path && object(model.workspacePackages, '/workspacePackages')[path]?.name !== workspace.name) fail('LOCKFILE_DRIFT', `/bun.lock/workspaces/${path}`, 'workspace manifest and lockfile must agree');
  }
  for (const path of manifest.workspaces) if (!lock.workspaces?.[path]) fail('LOCKFILE_DRIFT', '/bun.lock/workspaces', 'every workspace must be locked');
  const nested = model.allPaths.filter((path) => path !== 'bun.lock' && /(?:^|\/)(?:bun\.lock|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(path));
  if (nested.length > 0) fail('WORKSPACE_LOCKFILE_FORBIDDEN', pointer(nested.sort()[0]), 'nested lockfiles are forbidden');
}

export function provenance(model) {
  const provenanceSchema = object(model.provenanceSchema, '/provenanceSchema');
  const signatureSchema = object(model.signatureSchema, '/signatureSchema');
  if (provenanceSchema.title !== provenanceSchemaContract.title) fail('PROVENANCE_SCHEMA_CONTRACT_INVALID', '/provenanceSchema/title', 'provenance schema contract must be exact');
  if (signatureSchema.title !== signatureSchemaContract.title) fail('SIGNATURE_SCHEMA_CONTRACT_INVALID', '/signatureSchema/title', 'signature schema contract must be exact');
  const provenanceSchemaDifference = firstDifference(provenanceSchema, provenanceSchemaContract, '/provenanceSchema');
  if (provenanceSchemaDifference) fail('PROVENANCE_SCHEMA_CONTRACT_INVALID', provenanceSchemaDifference, 'provenance schema contract must be exact');
  const signatureSchemaDifference = firstDifference(signatureSchema, signatureSchemaContract, '/signatureSchema');
  if (signatureSchemaDifference) fail('SIGNATURE_SCHEMA_CONTRACT_INVALID', signatureSchemaDifference, 'signature schema contract must be exact');
  const value = object(model.provenance, '/provenance');
  exactKeys(value, ['$schema', 'schemaVersion', 'subject', 'repository', 'immutableIdentity', 'predicate', 'oidc', 'signature', 'verification', 'hostedAttestation'], '/provenance');
  if (value.$schema !== 'provenance.schema.json' || value.schemaVersion !== 'warrior-release-provenance-contract/v1') fail('PROVENANCE_INVALID', '/provenance', 'provenance metadata must be exact');
  const expected = { subject: { required: true, requiredFields: ['path', 'sha256'] }, repository: { required: true, provider: 'github', requiredFields: ['identity'] }, immutableIdentity: { required: true, requiredFields: ['ref', 'commit', 'workflow'] }, predicate: { required: true, type: 'https://slsa.dev/provenance/v1' }, oidc: { required: true, issuer: 'https://token.actions.githubusercontent.com' }, signature: { required: true, schemaRef: 'release/provenance/signature.schema.json', attestationRequired: true, signatureType: 'github-oidc-signed-attestation', issuer: 'https://token.actions.githubusercontent.com' }, verification: { required: true, command: 'gh attestation verify' }, hostedAttestation: { status: 'BLOCKED', blockedUntil: 'authorized-committed-workflow-execution', proof: null } };
  for (const [key, shape] of Object.entries(expected)) if (!equal(value[key], shape)) fail(key === 'signature' ? 'PROVENANCE_SIGNATURE_REQUIRED' : 'PROVENANCE_INVALID', `/provenance/${key}`, 'provenance contract must be exact');
}
