import { SyntaxKind } from 'typescript/unstable/ast';

export const projects = ['tools/content-pipeline', 'backend/functions', 'web/account', 'web/ops'];
export const workflows = ['client.yml', 'backend.yml', 'content.yml', 'security.yml', 'release.yml'];
export const parameterKeys = ['firebaseConfiguration', 'runtimeConfiguration', 'telemetryConfiguration'];
export const repositoryContractSha256 = 'c59694b86c6c149c9cf968fcac8879afe5924ecfbdd2276b8c33a3de563f06e6';
export const lockfilePolicyContract = { packageManager: 'bun', lockfile: 'bun.lock', singleRootLockfile: true, frozenInstallCommand: 'bun ci', workspaceLockfilesForbidden: true };
export const validationCommandsContract = ['bun run validate:scope', 'bun run audit:clean-room -- --strict', 'bun run test:schema', 'bun run validate:adr', 'bun run verify:repo', 'bun run verify:harness'];
export const regularExpressionPrefixKinds = new Set([SyntaxKind.OpenParenToken, SyntaxKind.OpenBracketToken, SyntaxKind.OpenBraceToken, SyntaxKind.CommaToken, SyntaxKind.ColonToken, SyntaxKind.SemicolonToken, SyntaxKind.QuestionToken, SyntaxKind.ReturnKeyword, SyntaxKind.ThrowKeyword, SyntaxKind.CaseKeyword, SyntaxKind.DeleteKeyword, SyntaxKind.VoidKeyword, SyntaxKind.TypeOfKeyword, SyntaxKind.NewKeyword, SyntaxKind.YieldKeyword, SyntaxKind.AwaitKeyword, SyntaxKind.ArrowToken]);
export const baseOptions = { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true, noImplicitReturns: true, noFallthroughCasesInSwitch: true, useUnknownInCatchVariables: true, verbatimModuleSyntax: true, isolatedModules: true, forceConsistentCasingInFileNames: true, noPropertyAccessFromIndexSignature: true, declaration: true, emitDeclarationOnly: true, skipLibCheck: true };
export const asmdefDefaults = Object.freeze({ rootNamespace: '', excludePlatforms: Object.freeze([]), allowUnsafeCode: false, overrideReferences: false, precompiledReferences: Object.freeze([]), autoReferenced: true, defineConstraints: Object.freeze([]), versionDefines: Object.freeze([]), noEngineReferences: false, optionalUnityReferences: Object.freeze([]) });
export const asmdefRules = Object.freeze({ explicitReferencesRequired: true, uniqueAssemblyNames: true, acyclic: true, noDanglingEdges: true, noRuntimeToTests: true, noCustomToPredefinedReferences: true, actualAsmdefsMustMatchPolicy: true, androidOnly: true, il2cppRequired: true, playFeatureDeliveryForbidden: true, iosReleaseForbidden: true });
export const T6_UNITY_CONTRACT = Object.freeze({
  editorVersion: '6000.5.4f1', packages: Object.freeze({ 'com.unity.addressables': '2.9.1', 'com.unity.addressables.android': '1.0.10', 'com.unity.inputsystem': '1.20.0', 'com.unity.localization': '1.5.12', 'com.unity.test-framework': '1.7.0', 'com.unity.ugui': '2.5.0' }),
  android: Object.freeze({ targetApi: 36, architectures: Object.freeze(['ARM64']), scriptingBackend: 'IL2CPP', artifactFormat: 'AAB', symbols: 'public' }),
  scenePaths: Object.freeze(['Assets/Scenes/Bootstrap.unity']), addressablesPath: 'Assets/AddressableAssetsData/AddressableAssetSettings.asset', padManifestPath: 'android/pad/manifest.json', outputPath: 'android/build/output.json', symbolsPath: 'android/build/symbols.json',
  padGroups: Object.freeze([Object.freeze({ name: 'content', deliveryType: 'install-time' })]),
  assemblies: Object.freeze([
    Object.freeze({ ...asmdefDefaults, name: 'Core', kind: 'runtime', path: 'Assets/Warrior/Runtime/Core/Core.asmdef', references: Object.freeze([]), includePlatforms: Object.freeze([]) }),
    Object.freeze({ ...asmdefDefaults, name: 'Domain', kind: 'runtime', path: 'Assets/Warrior/Runtime/Domain/Domain.asmdef', references: Object.freeze(['Core']), includePlatforms: Object.freeze([]) }),
    Object.freeze({ ...asmdefDefaults, name: 'Application', kind: 'runtime', path: 'Assets/Warrior/Runtime/Application/Application.asmdef', references: Object.freeze(['Core', 'Domain']), includePlatforms: Object.freeze([]) }),
    Object.freeze({ ...asmdefDefaults, name: 'Combat', kind: 'runtime', path: 'Assets/Warrior/Runtime/Combat/Combat.asmdef', references: Object.freeze(['Core', 'Domain']), includePlatforms: Object.freeze([]) }),
    Object.freeze({ ...asmdefDefaults, name: 'Content', kind: 'runtime', path: 'Assets/Warrior/Runtime/Content/Content.asmdef', references: Object.freeze(['Core', 'Domain']), includePlatforms: Object.freeze([]) }),
    Object.freeze({ ...asmdefDefaults, name: 'Platform', kind: 'runtime', path: 'Assets/Warrior/Runtime/Platform/Platform.asmdef', references: Object.freeze(['Core', 'Domain', 'Application']), includePlatforms: Object.freeze([]) }),
    Object.freeze({ ...asmdefDefaults, name: 'Presentation', kind: 'runtime', path: 'Assets/Warrior/Runtime/Presentation/Presentation.asmdef', references: Object.freeze(['Core', 'Domain', 'Application', 'Combat', 'Content']), includePlatforms: Object.freeze([]) }),
    Object.freeze({ ...asmdefDefaults, name: 'Tests.EditMode', kind: 'test-editmode', path: 'Assets/Warrior/Tests/EditMode/Tests.EditMode.asmdef', references: Object.freeze(['Core', 'Domain', 'Application', 'Combat', 'Content', 'Platform', 'Presentation']), includePlatforms: Object.freeze(['Editor']), optionalUnityReferences: Object.freeze(['TestAssemblies']) }),
    Object.freeze({ ...asmdefDefaults, name: 'Tests.PlayMode', kind: 'test-playmode', path: 'Assets/Warrior/Tests/PlayMode/Tests.PlayMode.asmdef', references: Object.freeze(['Core', 'Domain', 'Application', 'Combat', 'Content', 'Platform', 'Presentation']), includePlatforms: Object.freeze([]), optionalUnityReferences: Object.freeze(['TestAssemblies']) }),
  ]),
});
export const canonicalAssemblies = T6_UNITY_CONTRACT.assemblies;
export const unityPackageAssemblyReferences = Object.freeze({
  Application: Object.freeze(['Unity.InputSystem']),
  Presentation: Object.freeze(['UnityEngine.UI']),
});
export const unityPackageAssemblyShapes = Object.freeze({
  'Tests.PlayMode': Object.freeze({
    overrideReferences: true,
    precompiledReferences: Object.freeze(['nunit.framework.dll']),
  }),
});
export const environmentSchemaContract = {
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
export const provenanceSchemaContract = {
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
export const signatureSchemaContract = {
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
export const environmentMappings = {
  dev: { firebase: 'prerequisite:firebase-dev-project', appCheck: null, track: 'development', external: { playConsoleApp: null, playAppSigningCustody: null, deletionWebUrlDomain: null, dataSafetyPrivacyApproval: null, productionAlertTelemetryAccess: null } },
  stage: { firebase: 'prerequisite:firebase-stage-project', appCheck: null, track: 'internal', external: { playConsoleApp: null, playAppSigningCustody: null, deletionWebUrlDomain: null, dataSafetyPrivacyApproval: null, productionAlertTelemetryAccess: null } },
  prod: { firebase: 'prerequisite:firebase-prod-project', appCheck: 'prerequisite:app-check-play-integrity', track: 'production', external: { playConsoleApp: 'prerequisite:play-console-app', playAppSigningCustody: 'prerequisite:play-app-signing-custody', deletionWebUrlDomain: 'prerequisite:deletion-web-url-domain', dataSafetyPrivacyApproval: 'prerequisite:data-safety-privacy-approval', productionAlertTelemetryAccess: 'prerequisite:production-alert-telemetry-access' } },
};
