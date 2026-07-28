import { createHash } from 'node:crypto';
import { createScanner, SyntaxKind } from 'typescript/unstable/ast';
import { array, exactKeys, fail, object } from './contract-utils.mjs';
import { isForbiddenBinarySecretPath } from './repository-model.mjs';

const projects = ['tools/content-pipeline', 'backend/functions', 'web/account', 'web/ops'];
const workflows = ['client.yml', 'backend.yml', 'content.yml', 'security.yml', 'release.yml'];
const parameterKeys = ['firebaseConfiguration', 'runtimeConfiguration', 'telemetryConfiguration'];
const repositoryContractSha256 = '756b8b514f195ebfe6ca9ec0f473a4aa85224291de62152a637aac20f9f0d491';
const lockfilePolicyContract = { packageManager: 'bun', lockfile: 'bun.lock', singleRootLockfile: true, frozenInstallCommand: 'bun ci', workspaceLockfilesForbidden: true };
const validationCommandsContract = ['bun run validate:scope', 'bun run audit:clean-room -- --strict', 'bun run test:schema', 'bun run validate:adr', 'bun run verify:repo'];
const regularExpressionPrefixKinds = new Set([SyntaxKind.OpenParenToken, SyntaxKind.OpenBracketToken, SyntaxKind.OpenBraceToken, SyntaxKind.CommaToken, SyntaxKind.ColonToken, SyntaxKind.SemicolonToken, SyntaxKind.QuestionToken, SyntaxKind.ReturnKeyword, SyntaxKind.ThrowKeyword, SyntaxKind.CaseKeyword, SyntaxKind.DeleteKeyword, SyntaxKind.VoidKeyword, SyntaxKind.TypeOfKeyword, SyntaxKind.NewKeyword, SyntaxKind.YieldKeyword, SyntaxKind.AwaitKeyword, SyntaxKind.ArrowToken]);
const baseOptions = { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true, noImplicitReturns: true, noFallthroughCasesInSwitch: true, useUnknownInCatchVariables: true, verbatimModuleSyntax: true, isolatedModules: true, forceConsistentCasingInFileNames: true, noPropertyAccessFromIndexSignature: true, declaration: true, emitDeclarationOnly: true, skipLibCheck: true };
const canonicalAssemblies = [
  ['Core', 'runtime', []], ['Domain', 'runtime', ['Core']], ['Application', 'runtime', ['Core', 'Domain']], ['Combat', 'runtime', ['Core', 'Domain']], ['Content', 'runtime', ['Core', 'Domain']], ['Platform', 'runtime', ['Core', 'Domain', 'Application']], ['Presentation', 'runtime', ['Core', 'Domain', 'Application', 'Combat', 'Content']], ['Tests', 'tests', ['Core', 'Domain', 'Application', 'Combat', 'Content', 'Platform', 'Presentation']],
];
const environmentSchemaContract = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'release/environments/environment.schema.json',
  title: 'Non-secret release environment contract',
  $defs: {
    prerequisiteReference: { type: 'string', pattern: '^prerequisite:[a-z][a-z0-9-]*$' },
    nullablePrerequisiteReference: { oneOf: [{ $ref: '#/$defs/prerequisiteReference' }, { type: 'null' }] },
    parameterReference: { type: 'string', pattern: '^parameter:(?![a-z0-9-]*(?:dev|test|debug|emulator))[a-z][a-z0-9-]*$' },
    secretReference: { type: 'string', pattern: '^defineSecret:(?![a-z0-9-]*(?:dev|test|debug|emulator))[a-z][a-z0-9-]*$' },
    parameterRefs: {
      type: 'object', required: ['firebaseConfiguration', 'runtimeConfiguration', 'telemetryConfiguration'], additionalProperties: false,
      properties: {
        firebaseConfiguration: { $ref: '#/$defs/parameterReference' },
        runtimeConfiguration: { $ref: '#/$defs/parameterReference' },
        telemetryConfiguration: { $ref: '#/$defs/parameterReference' },
      },
    },
    secretRefs: {
      type: 'object', required: ['functionRuntime'], additionalProperties: false,
      properties: { functionRuntime: { $ref: '#/$defs/secretReference' } },
    },
    externalPrerequisiteRefs: {
      type: 'object', required: ['playConsoleApp', 'playAppSigningCustody', 'deletionWebUrlDomain', 'dataSafetyPrivacyApproval', 'productionAlertTelemetryAccess'], additionalProperties: false,
      properties: {
        playConsoleApp: { $ref: '#/$defs/nullablePrerequisiteReference' },
        playAppSigningCustody: { $ref: '#/$defs/nullablePrerequisiteReference' },
        deletionWebUrlDomain: { $ref: '#/$defs/nullablePrerequisiteReference' },
        dataSafetyPrivacyApproval: { $ref: '#/$defs/nullablePrerequisiteReference' },
        productionAlertTelemetryAccess: { $ref: '#/$defs/nullablePrerequisiteReference' },
      },
    },
  },
  type: 'object',
  required: ['$schema', 'schemaVersion', 'environmentId', 'androidApplicationRef', 'targetApi', 'androidAbi', 'firebasePrerequisiteRef', 'serviceIdentityPrerequisiteRef', 'appCheckPrerequisiteRef', 'contentVersionRef', 'releaseTrack', 'parameterRefs', 'secretRefs', 'externalPrerequisiteRefs'],
  additionalProperties: false,
  properties: {
    $schema: { const: 'environment.schema.json' },
    schemaVersion: { const: 'warrior-release-environment/v1' },
    environmentId: { enum: ['dev', 'stage', 'prod'] },
    androidApplicationRef: { const: 'prerequisite:android-package-name' },
    targetApi: { const: 36 },
    androidAbi: { const: 'arm64-v8a' },
    firebasePrerequisiteRef: { $ref: '#/$defs/prerequisiteReference' },
    serviceIdentityPrerequisiteRef: { const: 'prerequisite:firebase-service-identities' },
    appCheckPrerequisiteRef: { $ref: '#/$defs/nullablePrerequisiteReference' },
    contentVersionRef: { $ref: '#/$defs/parameterReference' },
    releaseTrack: { enum: ['development', 'internal', 'production'] },
    parameterRefs: { $ref: '#/$defs/parameterRefs' },
    secretRefs: { $ref: '#/$defs/secretRefs' },
    externalPrerequisiteRefs: { $ref: '#/$defs/externalPrerequisiteRefs' },
  },
  oneOf: [
    {
      properties: {
        environmentId: { const: 'dev' }, firebasePrerequisiteRef: { const: 'prerequisite:firebase-dev-project' }, appCheckPrerequisiteRef: { type: 'null' }, releaseTrack: { const: 'development' },
        externalPrerequisiteRefs: { properties: { playConsoleApp: { type: 'null' }, playAppSigningCustody: { type: 'null' }, deletionWebUrlDomain: { type: 'null' }, dataSafetyPrivacyApproval: { type: 'null' }, productionAlertTelemetryAccess: { type: 'null' } } },
      },
    },
    {
      properties: {
        environmentId: { const: 'stage' }, firebasePrerequisiteRef: { const: 'prerequisite:firebase-stage-project' }, appCheckPrerequisiteRef: { type: 'null' }, releaseTrack: { const: 'internal' },
        externalPrerequisiteRefs: { properties: { playConsoleApp: { type: 'null' }, playAppSigningCustody: { type: 'null' }, deletionWebUrlDomain: { type: 'null' }, dataSafetyPrivacyApproval: { type: 'null' }, productionAlertTelemetryAccess: { type: 'null' } } },
      },
    },
    {
      properties: {
        environmentId: { const: 'prod' }, firebasePrerequisiteRef: { const: 'prerequisite:firebase-prod-project' }, appCheckPrerequisiteRef: { const: 'prerequisite:app-check-play-integrity' }, releaseTrack: { const: 'production' },
        externalPrerequisiteRefs: { properties: { playConsoleApp: { const: 'prerequisite:play-console-app' }, playAppSigningCustody: { const: 'prerequisite:play-app-signing-custody' }, deletionWebUrlDomain: { const: 'prerequisite:deletion-web-url-domain' }, dataSafetyPrivacyApproval: { const: 'prerequisite:data-safety-privacy-approval' }, productionAlertTelemetryAccess: { const: 'prerequisite:production-alert-telemetry-access' } } },
      },
    },
  ],
};
const provenanceSchemaContract = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'release/provenance/provenance.schema.json', title: 'Release provenance requirement contract', type: 'object',
  required: ['$schema', 'schemaVersion', 'subject', 'repository', 'immutableIdentity', 'predicate', 'oidc', 'signature', 'verification', 'hostedAttestation'], additionalProperties: false,
  properties: {
    $schema: { const: 'provenance.schema.json' }, schemaVersion: { const: 'warrior-release-provenance-contract/v1' },
    subject: { type: 'object', required: ['required', 'requiredFields'], additionalProperties: false, properties: { required: { const: true }, requiredFields: { const: ['path', 'sha256'] } } },
    repository: { type: 'object', required: ['required', 'provider', 'requiredFields'], additionalProperties: false, properties: { required: { const: true }, provider: { const: 'github' }, requiredFields: { const: ['identity'] } } },
    immutableIdentity: { type: 'object', required: ['required', 'requiredFields'], additionalProperties: false, properties: { required: { const: true }, requiredFields: { const: ['ref', 'commit', 'workflow'] } } },
    predicate: { type: 'object', required: ['required', 'type'], additionalProperties: false, properties: { required: { const: true }, type: { const: 'https://slsa.dev/provenance/v1' } } },
    oidc: { type: 'object', required: ['required', 'issuer'], additionalProperties: false, properties: { required: { const: true }, issuer: { const: 'https://token.actions.githubusercontent.com' } } },
    signature: { $ref: 'signature.schema.json#/$defs/signatureContract' },
    verification: { type: 'object', required: ['required', 'command'], additionalProperties: false, properties: { required: { const: true }, command: { const: 'gh attestation verify' } } },
    hostedAttestation: { type: 'object', required: ['status', 'blockedUntil', 'proof'], additionalProperties: false, properties: { status: { const: 'BLOCKED' }, blockedUntil: { const: 'authorized-committed-workflow-execution' }, proof: { type: 'null' } } },
  },
};
const signatureSchemaContract = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'release/provenance/signature.schema.json', title: 'GitHub OIDC signed attestation contract',
  $defs: {
    signatureContract: {
      type: 'object', required: ['required', 'schemaRef', 'attestationRequired', 'signatureType', 'issuer'], additionalProperties: false,
      properties: {
        required: { const: true }, schemaRef: { const: 'release/provenance/signature.schema.json' }, attestationRequired: { const: true }, signatureType: { const: 'github-oidc-signed-attestation' }, issuer: { const: 'https://token.actions.githubusercontent.com' },
      },
    },
  },
  $ref: '#/$defs/signatureContract',
};
const environmentMappings = {
  dev: { firebase: 'prerequisite:firebase-dev-project', appCheck: null, track: 'development', external: { playConsoleApp: null, playAppSigningCustody: null, deletionWebUrlDomain: null, dataSafetyPrivacyApproval: null, productionAlertTelemetryAccess: null } },
  stage: { firebase: 'prerequisite:firebase-stage-project', appCheck: null, track: 'internal', external: { playConsoleApp: null, playAppSigningCustody: null, deletionWebUrlDomain: null, dataSafetyPrivacyApproval: null, productionAlertTelemetryAccess: null } },
  prod: { firebase: 'prerequisite:firebase-prod-project', appCheck: 'prerequisite:app-check-play-integrity', track: 'production', external: { playConsoleApp: 'prerequisite:play-console-app', playAppSigningCustody: 'prerequisite:play-app-signing-custody', deletionWebUrlDomain: 'prerequisite:deletion-web-url-domain', dataSafetyPrivacyApproval: 'prerequisite:data-safety-privacy-approval', productionAlertTelemetryAccess: 'prerequisite:production-alert-telemetry-access' } },
};

function equal(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function pointer(path) { return `/${path}`; }
function childPointer(at, key) { return `${at}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`; }

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function repositoryContract(model) {
  const contract = object(model.repositoryContract, '/repositoryContract');
  if (!equal(contract.lockfilePolicy, lockfilePolicyContract)) fail('REPOSITORY_CONTRACT_LOCKFILE_POLICY_INVALID', '/repositoryContract/lockfilePolicy', 'repository lockfile policy must be exact');
  if (!equal(contract.validationCommands, validationCommandsContract)) fail('REPOSITORY_CONTRACT_VALIDATION_COMMANDS_INVALID', '/repositoryContract/validationCommands', 'repository validation commands must be exact');
  const digest = createHash('sha256').update(JSON.stringify(canonicalize(contract))).digest('hex');
  if (digest !== repositoryContractSha256) fail('REPOSITORY_CONTRACT_INVALID', '/repositoryContract', 'repository contract must be canonical');
}

function binarySecretContainers(model) {
  const paths = [...new Set([...model.allPaths, ...Object.keys(model.repositoryFiles)])].sort();
  const forbidden = paths.find(isForbiddenBinarySecretPath);
  if (forbidden) fail('BINARY_SIGNING_CONTAINER_FORBIDDEN', pointer(forbidden), 'binary signing containers are forbidden');
}

function canStartRegularExpression(kind) {
  return kind === undefined || regularExpressionPrefixKinds.has(kind) || (kind >= SyntaxKind.FirstAssignment && kind <= SyntaxKind.LastAssignment) || (kind >= SyntaxKind.FirstBinaryOperator && kind <= SyntaxKind.LastBinaryOperator);
}

function firstDifference(actual, expected, at) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return at;
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(actual[index], expected[index], `${at}/${index}`);
      if (difference) return difference;
    }
    return null;
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return at;
    if (!equal(Object.keys(actual).sort(), Object.keys(expected).sort())) return at;
    for (const key of Object.keys(expected)) {
      const difference = firstDifference(actual[key], expected[key], childPointer(at, key));
      if (difference) return difference;
    }
    return null;
  }
  return Object.is(actual, expected) ? null : at;
}

function required(model) {
  const contract = object(model.repositoryContract, '/repositoryContract');
  for (const path of array(contract.requiredT5Roots, '/repositoryContract/requiredT5Roots')) if (!model.allPaths.some((item) => item.startsWith(`${path}/`))) fail('REQUIRED_ROOT_MISSING', pointer(path), 'required T5 root is missing');
  for (const path of array(contract.requiredT5Files, '/repositoryContract/requiredT5Files')) if (!model.allPaths.includes(path)) fail('REQUIRED_FILE_MISSING', pointer(path), 'required T5 file is missing');
}

function typescript(model) {
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

function asmdefs(model) {
  const policy = object(model.asmdefPolicy, '/asmdefPolicy');
  if (!equal(policy.referenceForms, ['name', 'guid']) || policy.rules?.acyclic !== true || policy.rules?.futureActualAsmdefsMustMatchPolicy !== true) fail('ASMDEF_POLICY_INVALID', '/asmdefPolicy', 'assembly policy rules must be exact');
  const assemblies = array(policy.assemblies, '/asmdefPolicy/assemblies');
  if (assemblies.length !== canonicalAssemblies.length) fail('ASMDEF_GRAPH_DRIFT', '/asmdefPolicy/assemblies', 'assembly graph must be canonical');
  const names = new Set();
  assemblies.forEach((assembly, index) => {
    const [name, kind, references] = canonicalAssemblies[index];
    if (names.has(assembly.name)) fail('ASMDEF_DUPLICATE_NAME', `/asmdefPolicy/assemblies/${index}/name`, 'assembly names must be unique');
    names.add(assembly.name);
    if (assembly.name !== name || assembly.kind !== kind || !equal(assembly.references, references)) fail('ASMDEF_GRAPH_DRIFT', `/asmdefPolicy/assemblies/${index}`, 'assembly graph must be exact');
  });
  const actual = model.allPaths.filter((path) => path.endsWith('.asmdef') || path.endsWith('.asmref'));
  if (actual.length > 0) fail('ASMDEF_T6_ARTIFACT_FORBIDDEN', pointer(actual.sort()[0]), 'actual asmdef and asmref files are forbidden during T5');
}

function environments(model) {
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

function firestore(model) {
  const value = object(model.firestore, '/firestore');
  const rules = typeof value.rules === 'string' ? value.rules.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '').replace(/\s+/g, '') : '';
  if (rules !== "rules_version='2';servicecloud.firestore{match/databases/{database}/documents{match/{document=**}{allowread,write:iffalse;}}}") fail('FIRESTORE_RULES_PERMISSIVE', '/firestore/rules', 'Firestore rules must be the T5 deny-all contract');
  const indexes = value.indexes;
  if (!indexes || typeof indexes !== 'object' || Array.isArray(indexes) || !equal(Object.keys(indexes).sort(), ['fieldOverrides', 'indexes']) || !equal(indexes.indexes, []) || !equal(indexes.fieldOverrides, [])) fail('FIRESTORE_INDEXES_NONEMPTY', '/firestore/indexes', 'Firestore indexes must be empty');
}

function packages(model) {
  const manifest = object(model.packageManifest, '/packageManifest');
  if (manifest.packageManager !== 'bun@1.3.14' || !equal(manifest.workspaces, ['backend/functions', 'web/account', 'web/ops']) || !equal(manifest.devDependencies, { typescript: '7.0.2', yaml: '2.9.0' })) fail('PACKAGE_MANIFEST_DRIFT', '/package.json', 'root package contract must be exact');
  const lock = object(model.lockfile.document, '/bun.lock');
  if (!equal(lock.workspaces?.['']?.devDependencies, { typescript: '7.0.2', yaml: '2.9.0' }) || !lock.packages?.typescript || !lock.packages?.yaml) fail('LOCKFILE_DRIFT', '/bun.lock', 'root dependencies must be locked exactly');
  for (const [path, workspace] of Object.entries(object(lock.workspaces, '/bun.lock/workspaces'))) {
    if (path && !manifest.workspaces.includes(path)) fail('LOCKFILE_DRIFT', '/bun.lock/workspaces', 'lockfile has an undeclared workspace');
    if (path && object(model.workspacePackages, '/workspacePackages')[path]?.name !== workspace.name) fail('LOCKFILE_DRIFT', `/bun.lock/workspaces/${path}`, 'workspace manifest and lockfile must agree');
  }
  for (const path of manifest.workspaces) if (!lock.workspaces?.[path]) fail('LOCKFILE_DRIFT', '/bun.lock/workspaces', 'every workspace must be locked');
  const nested = model.allPaths.filter((path) => path !== 'bun.lock' && /(?:^|\/)(?:bun\.lock|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(path));
  if (nested.length > 0) fail('WORKSPACE_LOCKFILE_FORBIDDEN', pointer(nested.sort()[0]), 'nested lockfiles are forbidden');
}

function provenance(model) {
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

function stripComments(path, source) {
  let value = source;
  if (/\.[cm]?[jt]sx?$/i.test(path)) {
    const scanner = createScanner(false, undefined, source);
    const comments = [];
    let previous;
    for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
      if (kind === SyntaxKind.SlashToken && canStartRegularExpression(previous)) kind = scanner.reScanSlashToken();
      if (kind === SyntaxKind.SingleLineCommentTrivia || kind === SyntaxKind.MultiLineCommentTrivia) comments.push([scanner.getTokenStart(), scanner.getTokenEnd()]);
      else if (kind !== SyntaxKind.WhitespaceTrivia && kind !== SyntaxKind.NewLineTrivia) previous = kind;
      if (scanner.getTokenEnd() <= scanner.getTokenStart()) scanner.resetTokenState(scanner.getTokenStart() + 1);
    }
    let offset = 0;
    value = comments.map(([start, end]) => {
      const text = source.slice(offset, start);
      offset = end;
      return text;
    }).join('') + source.slice(offset);
  } else if (/\.(?:tf|gradle)$/i.test(path)) value = value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');
  if (/(?:\.tf|\.toml|\.properties|\.(?:sh|bash|zsh)|(?:^|\/)Dockerfile(?:\.|$))/i.test(path)) value = value.replace(/#[^\r\n]*/g, '');
  if (/\.properties$/i.test(path)) value = value.replace(/^\s*!.*$/gm, '');
  return value;
}

function isInfrastructureConfiguration(path) {
  return /(?:\.tf|\.toml|\.gradle|\.properties|\.(?:sh|bash|zsh)|(?:^|\/)Dockerfile(?:\.|$))/i.test(path);
}

function boundaries(model) {
  const forbidden = /microservices|kubernetes|websocket-gateway|play-feature-delivery|ios-release-targets/i;
  for (const path of model.allPaths) {
    if (forbidden.test(path)) fail('FORBIDDEN_INFRASTRUCTURE', pointer(path), 'forbidden infrastructure is outside T5');
    if (path.startsWith('client/WarriorRaising/') && (/(?:^|\/)(?:Assets|Packages|ProjectSettings)(?:\/|$)/.test(path) || /\.(?:asmdef|asmref|unity)$/i.test(path))) fail('T6_ARTIFACT_FORBIDDEN', pointer(path), 'Unity T6 artifacts are forbidden');
  }
  for (const [path, file] of Object.entries(model.repositoryFiles)) {
    const implementation = ['.github/', 'backend/', 'client/', 'release/environments/', 'web/', 'tools/content-pipeline/'].some((root) => path.startsWith(root)) || ['package.json', 'tsconfig.json', 'tsconfig.base.json', '.gitignore'].includes(path);
    if (!implementation) continue;
    const content = stripComments(path, file.content);
    if (isInfrastructureConfiguration(path) && content.trim() !== '') fail('FORBIDDEN_INFRASTRUCTURE', pointer(path), 'infrastructure configuration is outside T5');
    if (/\.[cm]?[jt]sx?$/i.test(path) && /\bnew\s+URL\s*\(/.test(content)) fail('TYPESCRIPT_URL_FORBIDDEN', pointer(path), 'runtime URL construction is forbidden during T5');
    if (forbidden.test(content)) fail('FORBIDDEN_INFRASTRUCTURE', pointer(path), 'forbidden infrastructure configuration is outside T5');
  }
}

function entries(value, at, output = []) {
  if (Array.isArray(value)) value.forEach((item, index) => entries(item, `${at}/${index}`, output));
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    const child = childPointer(at, key);
    output.push([key, item, child]);
    entries(item, child, output);
  }
  return output;
}

function workflowCommand(value, at) {
  if (typeof value !== 'string') return;
  if (/\bpublish\b/i.test(value)) fail('WORKFLOW_PUBLISH_FORBIDDEN', at, 'publishing commands are forbidden during T5');
  if (/\b(?:deploy|rollout)\b/i.test(value)) fail('WORKFLOW_DEPLOY_FORBIDDEN', at, 'deployment commands are forbidden during T5');
}

function workflowAction(value, at, release) {
  if (typeof value !== 'string') fail('WORKFLOW_ACTION_UNPINNED', at, 'workflow actions must have immutable SHA pins');
  const match = /^([^@]+)@([0-9a-f]{40})$/i.exec(value);
  if (!match) fail('WORKFLOW_ACTION_UNPINNED', at, 'workflow actions must have immutable SHA pins');
  const slug = match[1];
  if (slug === 'actions/attest-build-provenance' && !release) fail('WORKFLOW_OIDC_FORBIDDEN', at, 'attestation is release-only');
  const trusted = release ? ['actions/checkout', 'oven-sh/setup-bun', 'actions/attest-build-provenance'] : ['actions/checkout', 'oven-sh/setup-bun'];
  if (!trusted.includes(slug)) fail('WORKFLOW_ACTION_UNTRUSTED', at, 'workflow action is not trusted for T5');
}

function releaseStepsPointer(jobs, at) {
  const name = Object.hasOwn(jobs, 'verify') ? 'verify' : Object.keys(jobs).sort()[0];
  return name ? `${at}/jobs/${name}/steps` : `${at}/jobs`;
}

function releaseAttestation(workflow, at) {
  const jobs = object(workflow.jobs, `${at}/jobs`);
  const stepsAt = releaseStepsPointer(jobs, at);
  const attestations = [];
  for (const [jobName, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object' || !Array.isArray(job.steps)) continue;
    job.steps.forEach((step, index) => {
      if (step && typeof step === 'object' && typeof step.uses === 'string' && step.uses.startsWith('actions/attest-build-provenance@')) attestations.push({ step, at: `${at}/jobs/${jobName}/steps/${index}` });
    });
  }
  if (attestations.length !== 1) fail('WORKFLOW_ATTESTATION_SUBJECTS_INVALID', stepsAt, 'release must contain exactly one attestation action');
  const { step } = attestations[0];
  if (!equal(Object.keys(step).sort(), ['uses', 'with']) || !step.with || typeof step.with !== 'object' || Array.isArray(step.with) || !equal(Object.keys(step.with), ['subject-path']) || step.with['subject-path'] !== 'release/provenance/contract.json') fail('WORKFLOW_ATTESTATION_SUBJECTS_INVALID', stepsAt, 'release attestation subject must be the provenance contract only');
}

function workflowPolicy(model) {
  const actual = [...new Set(model.allPaths.filter((path) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path)))].sort();
  const unexpected = actual.find((path) => !workflows.includes(path.slice('.github/workflows/'.length)));
  if (unexpected) fail('WORKFLOW_FILE_UNEXPECTED', pointer(unexpected), 'workflow file is not part of the T5 inventory');
  for (const name of workflows) {
    const workflow = model.workflows[name];
    const at = `/.github/workflows/${name}`;
    if (!workflow) fail('REQUIRED_FILE_MISSING', at, 'required workflow is missing');
    const release = name === 'release.yml';
    if (!equal(workflow.on, release ? { workflow_dispatch: null } : { push: { branches: ['main'] }, pull_request: null })) fail('WORKFLOW_TRIGGER_FORBIDDEN', `${at}/on`, 'workflow triggers must be exact');
    if (!equal(workflow.permissions, release ? { contents: 'read', 'id-token': 'write', attestations: 'write' } : { contents: 'read' })) fail('WORKFLOW_PERMISSION_EXCESSIVE', `${at}/permissions`, 'workflow permissions must be exact');
    const jobs = object(workflow.jobs, `${at}/jobs`);
    for (const [jobName, job] of Object.entries(jobs)) if (job && typeof job === 'object' && Object.hasOwn(job, 'permissions')) fail('WORKFLOW_JOB_PERMISSION_EXCESSIVE', `${at}/jobs/${jobName}/permissions`, 'job-level permissions are forbidden');
    const values = entries(workflow, at);
    if (!values.some(([key, value]) => key === 'run' && value === 'bun ci')) fail('WORKFLOW_BUN_CI_REQUIRED', at, 'workflow must execute literal bun ci');
    for (const [key, value, valueAt] of values) {
      if (key === 'run' || key === 'uses') workflowCommand(value, valueAt);
      if (key === 'uses') workflowAction(value, valueAt, release);
    }
    if (!release && values.some(([key]) => key === 'id-token')) fail('WORKFLOW_OIDC_FORBIDDEN', at, 'OIDC is release-only');
    if (release) releaseAttestation(workflow, at);
  }
}

export async function validateRepositoryPolicy(model) { repositoryContract(model); binarySecretContainers(model); required(model); typescript(model); asmdefs(model); environments(model); firestore(model); packages(model); provenance(model); workflowPolicy(model); boundaries(model); }
