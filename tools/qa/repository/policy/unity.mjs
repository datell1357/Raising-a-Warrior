import { array, exactKeys, fail, object } from '../contract-utils.mjs';
import { parseUnityArtifactFiles, shouldIgnoreRepositoryPath } from '../repository-model.mjs';
import { projects, workflows, parameterKeys, repositoryContractSha256, lockfilePolicyContract, validationCommandsContract, regularExpressionPrefixKinds, baseOptions, asmdefDefaults, asmdefRules, T6_UNITY_CONTRACT, canonicalAssemblies, unityPackageAssemblyReferences, unityPackageAssemblyShapes, environmentSchemaContract, provenanceSchemaContract, signatureSchemaContract, environmentMappings } from './contracts.mjs';
import { equal, firstDifference } from './shared.mjs';

export function validateUnityPolicyDeclaration(policyValue) {
  const expected = { kind: 'unity-asmdef-policy', contract: 'T6-P1', scope: { stage: 'T6', boundary: 'unity-android-shell' }, referenceForms: ['name'], rules: asmdefRules, unity: { editorVersion: T6_UNITY_CONTRACT.editorVersion, packages: T6_UNITY_CONTRACT.packages, android: T6_UNITY_CONTRACT.android, scenePaths: T6_UNITY_CONTRACT.scenePaths, addressables: { settingsPath: T6_UNITY_CONTRACT.addressablesPath, padManifestPath: T6_UNITY_CONTRACT.padManifestPath, padGroups: T6_UNITY_CONTRACT.padGroups }, buildMetadata: { outputPath: T6_UNITY_CONTRACT.outputPath, symbolsPath: T6_UNITY_CONTRACT.symbolsPath } }, assemblies: canonicalAssemblies };
  const difference = firstDifference(object(policyValue, '/asmdefPolicy'), expected, '/asmdefPolicy');
  if (difference) fail(difference.startsWith('/asmdefPolicy/assemblies') ? 'ASMDEF_GRAPH_DRIFT' : 'ASMDEF_POLICY_INVALID', difference, 'T6 assembly policy declaration must be exact');
}

export function candidateAssemblies(value) {
  const candidate = object(value, '');
  const assemblies = array(candidate.asmdefs, '/asmdefs');
  const byName = new Map();
  for (const assembly of assemblies) {
    const current = object(assembly, '/asmdefs');
    if (typeof current.name !== 'string') fail('UNITY_ASMDEF_INVALID', '/asmdefs', 'assembly name is required');
    if (byName.has(current.name)) fail('UNITY_ASMDEF_DUPLICATE', `/asmdefs/${current.name}`, 'assembly names must be unique');
    byName.set(current.name, current);
  }
  for (const expected of canonicalAssemblies) if (!byName.has(expected.name)) fail(expected.kind === 'runtime' ? 'UNITY_ASMDEF_RUNTIME_MISSING' : 'UNITY_ASMDEF_TEST_MISSING', `/asmdefs/${expected.name}`, 'required assembly is missing');
  const extra = [...byName.keys()].find((name) => !canonicalAssemblies.some((expected) => expected.name === name));
  if (extra) fail('UNITY_ASMDEF_EXTRA', `/asmdefs/${extra}`, 'assembly is not in the T6 graph');
  return byName;
}

export function containsCycle(assemblies) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (name) => {
    if (visiting.has(name)) return true;
    if (visited.has(name)) return false;
    visiting.add(name);
    const references = Array.isArray(assemblies.get(name)?.references) ? assemblies.get(name).references : [];
    for (const reference of references) if (assemblies.has(reference) && visit(reference)) return true;
    visiting.delete(name);
    visited.add(name);
    return false;
  };
  return [...assemblies.keys()].some(visit);
}

export function validateUnityCandidate(value) {
  const candidate = object(value, '');
  const unity = object(candidate.unity, '/unity');
  if (unity.editorMajor !== 6000 || unity.targetApi !== 36 || unity.androidAbi !== 'ARM64' || unity.artifactFormat !== 'AAB' || unity.symbols !== 'public' || unity.pad !== 'asset-pack' || unity.playFeatureDelivery !== false || unity.iosReleaseTarget !== false) fail('UNITY_CANDIDATE_INVALID', '/unity', 'candidate Unity metadata must be exact');
  const assemblies = candidateAssemblies(candidate);
  for (const expected of canonicalAssemblies) {
    const actual = assemblies.get(expected.name);
    const references = Array.isArray(actual.references) ? actual.references : [];
    for (let index = 0; index < references.length; index += 1) if (expected.kind === 'runtime' && String(references[index]).startsWith('Tests.')) fail('UNITY_ASMDEF_RUNTIME_TO_TEST', `/asmdefs/${expected.name}/references/${index}`, 'runtime assemblies may not reference tests');
    if (!equal(actual.includePlatforms, expected.includePlatforms)) fail('UNITY_TEST_PLATFORM_INVALID', `/asmdefs/${expected.name}/includePlatforms/0`, 'test assembly platforms must be exact');
  }
  const domain = assemblies.get('Domain');
  if (Array.isArray(domain.references) && domain.references.includes('Presentation')) fail('UNITY_ASMDEF_REVERSE_REFERENCE', `/asmdefs/Domain/references/${domain.references.indexOf('Presentation')}`, 'layer references must not point toward presentation');
  if (containsCycle(assemblies)) fail('UNITY_ASMDEF_CYCLE', '/asmdefs', 'assembly references must be acyclic');
  for (const expected of canonicalAssemblies) if (!equal(assemblies.get(expected.name).references, expected.references)) fail('UNITY_ASMDEF_REFERENCE_INVALID', `/asmdefs/${expected.name}/references`, 'assembly references must be exact');
}

export function validateUnityProject(unity) {
  if (unity.projectVersion !== T6_UNITY_CONTRACT.editorVersion) fail('UNITY_VERSION_INVALID', '/ProjectSettings/ProjectVersion.txt', 'Unity editor version must be 6000.5.4f1');
  const manifest = object(unity.manifest, '/Packages/manifest.json');
  exactKeys(manifest, ['dependencies', 'enableLockFile', 'resolutionStrategy'], '/Packages/manifest.json');
  const dependencies = object(manifest.dependencies, '/Packages/manifest.json/dependencies');
  if (dependencies['com.unity.modules.pfd']) fail('PLAY_FEATURE_DELIVERY_FORBIDDEN', '/Packages/manifest.json/dependencies/com.unity.modules.pfd', 'Play Feature Delivery is forbidden');
  if (!Object.hasOwn(dependencies, 'com.unity.addressables')) fail('UNITY_PACKAGE_REQUIRED', '/Packages/manifest.json/dependencies/com.unity.addressables', 'Addressables package is required');
  if (manifest.enableLockFile !== true || manifest.resolutionStrategy !== 'lowest' || !equal(dependencies, T6_UNITY_CONTRACT.packages)) fail('UNITY_PACKAGE_MANIFEST_INVALID', '/Packages/manifest.json', 'Unity manifest direct dependencies and fields must be exact');
  const lock = object(unity.lock, '/Packages/packages-lock.json');
  exactKeys(lock, ['dependencies'], '/Packages/packages-lock.json');
  const lockDependencies = object(lock.dependencies, '/Packages/packages-lock.json/dependencies');
  const expectedSources = { 'com.unity.addressables': 'registry', 'com.unity.addressables.android': 'registry', 'com.unity.inputsystem': 'registry', 'com.unity.localization': 'registry', 'com.unity.test-framework': 'builtin', 'com.unity.ugui': 'builtin' };
  for (const [name, version] of Object.entries(T6_UNITY_CONTRACT.packages)) {
    const entry = object(lockDependencies[name], `/Packages/packages-lock.json/dependencies/${name}`);
    if (entry.version !== version || entry.depth !== 0 || entry.source !== expectedSources[name]) fail('UNITY_PACKAGE_LOCK_INVALID', `/Packages/packages-lock.json/dependencies/${name}`, 'direct Unity lock entry must use the pinned version, depth zero, and canonical source');
  }
  const extraDirect = Object.entries(lockDependencies).find(([name, entry]) => entry && typeof entry === 'object' && !Array.isArray(entry) && entry.depth === 0 && !Object.hasOwn(T6_UNITY_CONTRACT.packages, name));
  if (extraDirect) fail('UNITY_PACKAGE_DIRECT_EXTRA', `/Packages/packages-lock.json/dependencies/${extraDirect[0]}`, 'direct Unity lock dependencies must be declared and canonical');
  if (unity.android.ios !== null && unity.android.ios !== 'disabled') fail('IOS_TARGET_FORBIDDEN', '/ProjectSettings/ProjectSettings.asset/iOS', 'iOS release target is forbidden');
  if (unity.android.targetApi !== '36') fail('ANDROID_TARGET_API_INVALID', '/ProjectSettings/ProjectSettings.asset/AndroidTargetSdkVersion', 'Android target API must be 36');
  if (!['ARM64', '2'].includes(unity.android.architectures)) fail('ANDROID_ABI_INVALID', '/ProjectSettings/ProjectSettings.asset/AndroidTargetArchitectures', 'Android must be ARM64-only');
  if (!['IL2CPP', '1'].includes(unity.android.scriptingBackend)) fail('ANDROID_IL2CPP_REQUIRED', '/ProjectSettings/ProjectSettings.asset/AndroidScriptingBackend', 'Android scripting backend must be IL2CPP');
  if (unity.buildEvidenceReady && unity.output?.format !== 'AAB') fail('ANDROID_AAB_REQUIRED', '/android/build/output', 'Android output must be an AAB');
  if (unity.buildEvidenceReady && (unity.symbols?.enabled !== true || unity.symbols?.level !== 'public')) fail('ANDROID_SYMBOLS_REQUIRED', '/android/build/symbols', 'public symbols are required');
  if (!equal(unity.scenes, T6_UNITY_CONTRACT.scenePaths)) fail('UNITY_SCENE_INVALID', '/Assets/Scenes', 'scene inventory must be exact');
  if (typeof unity.addressables !== 'string' || !unity.addressables.includes('AddressableAssetSettings')) fail('UNITY_ADDRESSABLES_REQUIRED', `/${T6_UNITY_CONTRACT.addressablesPath}`, 'Addressables settings are required');
  if (!equal(unity.pad?.groups, T6_UNITY_CONTRACT.padGroups)) fail('ANDROID_PAD_REQUIRED', '/android/pad', 'PAD metadata must be exact');
  if (unity.asmrefs.length !== 0) fail('UNITY_ASMREF_FORBIDDEN', `/${unity.asmrefs[0]}`, 'asmrefs are not part of the exact graph');
  if (!/\[UnityPlatform\(RuntimePlatform\.Android\)\]/.test(unity.files['Assets/Warrior/Tests/PlayMode/BootstrapShellPlayModeTests.cs'] ?? '')) fail('UNITY_PLAYMODE_RUNTIME_PLATFORM_INVALID', '/Assets/Warrior/Tests/PlayMode/BootstrapShellPlayModeTests.cs', 'PlayMode tests must restrict execution to Android at class level');
  for (const expected of canonicalAssemblies) {
    const actual = unity.asmdefs.find((assembly) => assembly.name === expected.name);
    if (!actual) continue;
    if (!equal(actual.rootNamespace, expected.rootNamespace)) fail('UNITY_ASMDEF_SHAPE_INVALID', `/${actual.path}/rootNamespace`, 'asmdef behavior shape must be exact');
    const projectNames = new Set(canonicalAssemblies.map((assembly) => assembly.name));
    const projectReferences = actual.references.filter((reference) => projectNames.has(reference));
    const packageReferences = actual.references.filter((reference) => !projectNames.has(reference));
    if (!equal(projectReferences, expected.references) || !equal(packageReferences, unityPackageAssemblyReferences[actual.name] ?? [])) fail('UNITY_ASMDEF_SHAPE_INVALID', `/${actual.path}/references`, 'asmdef behavior shape must be exact');
    const packageShape = unityPackageAssemblyShapes[actual.name] ?? {};
    for (const key of ['includePlatforms', 'excludePlatforms', 'allowUnsafeCode', 'overrideReferences', 'precompiledReferences', 'autoReferenced', 'defineConstraints', 'versionDefines', 'noEngineReferences', 'optionalUnityReferences']) if (!equal(actual[key], Object.hasOwn(packageShape, key) ? packageShape[key] : expected[key])) fail('UNITY_ASMDEF_SHAPE_INVALID', `/${actual.path}/${key}`, 'asmdef behavior shape must be exact');
  }
  const projectNames = new Set(canonicalAssemblies.map((assembly) => assembly.name));
  const candidate = { unity: { editorMajor: 6000, targetApi: 36, androidAbi: 'ARM64', artifactFormat: 'AAB', symbols: 'public', pad: 'asset-pack', playFeatureDelivery: false, iosReleaseTarget: false }, asmdefs: unity.asmdefs.map((assembly) => ({ name: assembly.name, kind: canonicalAssemblies.find((expected) => expected.name === assembly.name)?.kind ?? 'runtime', references: assembly.references.filter((reference) => projectNames.has(reference)), includePlatforms: assembly.includePlatforms })) };
  validateUnityCandidate(candidate);
  for (const expected of canonicalAssemblies) if (unity.asmdefs.find((assembly) => assembly.name === expected.name)?.path !== expected.path) fail('UNITY_ASMDEF_PATH_INVALID', `/Assets`, 'asmdef paths must be exact');
}

export function expectT6Probe(label, action, code, pointer) {
  try { action(); }
  catch (error) {
    if (error instanceof Error && error.code === code && error.pointer === pointer) return { label, code, pointer };
    throw error;
  }
  fail('T6_POLICY_PROBE_FAILED', pointer, `${label} unexpectedly passed`);
}

export function t6ProbeArtifacts() {
  const files = Object.fromEntries(canonicalAssemblies.map((assembly) => {
    const declaration = Object.fromEntries(Object.entries(assembly).filter(([key]) => key !== 'path' && key !== 'kind'));
    declaration.references = [...assembly.references, ...(unityPackageAssemblyReferences[assembly.name] ?? [])];
    Object.assign(declaration, unityPackageAssemblyShapes[assembly.name] ?? {});
    return [assembly.path, JSON.stringify(declaration)];
  }));
  files['ProjectSettings/ProjectVersion.txt'] = 'm_EditorVersion: 6000.5.4f1\n';
  files['Packages/manifest.json'] = JSON.stringify({ dependencies: T6_UNITY_CONTRACT.packages, enableLockFile: true, resolutionStrategy: 'lowest' });
  files['Packages/packages-lock.json'] = JSON.stringify({ dependencies: Object.fromEntries(Object.entries(T6_UNITY_CONTRACT.packages).map(([name, version]) => [name, { version, depth: 0, source: name === 'com.unity.test-framework' || name === 'com.unity.ugui' ? 'builtin' : 'registry' }])) });
  files['ProjectSettings/ProjectSettings.asset'] = 'AndroidTargetSdkVersion: 36\nAndroidTargetArchitectures: ARM64\nAndroidScriptingBackend: IL2CPP\niOS: disabled\n';
  files['Assets/Scenes/Bootstrap.unity'] = '%YAML 1.1\n';
  files['Assets/AddressableAssetsData/AddressableAssetSettings.asset'] = 'AddressableAssetSettings:\n';
  files['android/pad/manifest.json'] = JSON.stringify({ groups: T6_UNITY_CONTRACT.padGroups });
  files['Assets/Warrior/Tests/PlayMode/BootstrapShellPlayModeTests.cs'] = '[UnityPlatform(RuntimePlatform.Android)]\n';
  return files;
}

export function runT6PolicyMutationProbes(policy) {
  const declaration = structuredClone(policy);
  declaration.rules.acyclic = false;
  const behavior = t6ProbeArtifacts();
  behavior['Assets/Warrior/Runtime/Core/Core.asmdef'] = JSON.stringify({ ...JSON.parse(behavior['Assets/Warrior/Runtime/Core/Core.asmdef']), precompiledReferences: ['forged.dll'] });
  const hidden = t6ProbeArtifacts();
  hidden['Assets/dist/Hidden.asmdef'] = JSON.stringify({ ...JSON.parse(hidden['Assets/Warrior/Runtime/Core/Core.asmdef']), name: 'Hidden' });
  const source = t6ProbeArtifacts();
  const sourceLock = JSON.parse(source['Packages/packages-lock.json']);
  sourceLock.dependencies['com.unity.addressables'].source = 'git';
  source['Packages/packages-lock.json'] = JSON.stringify(sourceLock);
  const depth = t6ProbeArtifacts();
  const depthLock = JSON.parse(depth['Packages/packages-lock.json']);
  depthLock.dependencies['com.unity.addressables'].depth = 1;
  depth['Packages/packages-lock.json'] = JSON.stringify(depthLock);
  const extra = t6ProbeArtifacts();
  const extraManifest = JSON.parse(extra['Packages/manifest.json']);
  extraManifest.dependencies['com.unity.local'] = 'file:../local';
  extra['Packages/manifest.json'] = JSON.stringify(extraManifest);
  const missingOptional = structuredClone(policy);
  delete missingOptional.assemblies[7].optionalUnityReferences;
  const extraOptional = structuredClone(policy);
  extraOptional.assemblies[8].optionalUnityReferences.push('Extra');
  const driftOptional = structuredClone(policy);
  driftOptional.assemblies[7].optionalUnityReferences = [];
  const disabledSymbols = t6ProbeArtifacts();
  disabledSymbols['android/build/output.json'] = JSON.stringify({ format: 'AAB' });
  disabledSymbols['android/build/symbols.json'] = JSON.stringify({ enabled: false, level: 'public' });
  return [
    expectT6Probe('forged-declaration', () => validateUnityPolicyDeclaration(declaration), 'ASMDEF_POLICY_INVALID', '/asmdefPolicy/rules/acyclic'),
    expectT6Probe('asmdef-precompiled-reference', () => validateUnityProject(parseUnityArtifactFiles(behavior)), 'UNITY_ASMDEF_SHAPE_INVALID', '/Assets/Warrior/Runtime/Core/Core.asmdef/precompiledReferences'),
    expectT6Probe('hidden-asmdef', () => validateUnityProject(parseUnityArtifactFiles(hidden)), 'UNITY_ASMDEF_EXTRA', '/asmdefs/Hidden'),
    expectT6Probe('package-lock-source', () => validateUnityProject(parseUnityArtifactFiles(source)), 'UNITY_PACKAGE_LOCK_INVALID', '/Packages/packages-lock.json/dependencies/com.unity.addressables'),
    expectT6Probe('package-lock-depth', () => validateUnityProject(parseUnityArtifactFiles(depth)), 'UNITY_PACKAGE_LOCK_INVALID', '/Packages/packages-lock.json/dependencies/com.unity.addressables'),
    expectT6Probe('package-direct-extra', () => validateUnityProject(parseUnityArtifactFiles(extra)), 'UNITY_PACKAGE_MANIFEST_INVALID', '/Packages/manifest.json'),
    expectT6Probe('test-optional-reference-removed', () => validateUnityPolicyDeclaration(missingOptional), 'ASMDEF_GRAPH_DRIFT', '/asmdefPolicy/assemblies/7'),
    expectT6Probe('test-optional-reference-extra', () => validateUnityPolicyDeclaration(extraOptional), 'ASMDEF_GRAPH_DRIFT', '/asmdefPolicy/assemblies/8/optionalUnityReferences'),
    expectT6Probe('test-optional-reference-drift', () => validateUnityPolicyDeclaration(driftOptional), 'ASMDEF_GRAPH_DRIFT', '/asmdefPolicy/assemblies/7/optionalUnityReferences'),
    expectT6Probe('build-evidence-disabled-symbols', () => validateUnityProject(parseUnityArtifactFiles(disabledSymbols)), 'ANDROID_SYMBOLS_REQUIRED', '/android/build/symbols'),
    shouldIgnoreRepositoryPath('client/WarriorRaising/Assets/dist') ? fail('T6_POLICY_PROBE_FAILED', '/client/WarriorRaising/Assets/dist', 'Unity Assets paths must not be ignored') : { label: 'ignored-unity-path', code: 'PASS', pointer: '/client/WarriorRaising/Assets/dist' },
  ];
}
