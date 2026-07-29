import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from 'bun:test';

const buildSource = readFileSync('client/WarriorRaising/Assets/Editor/T6AndroidBuild.cs', 'utf8');
const configuratorSource = readFileSync('client/WarriorRaising/Assets/Editor/T6ProjectConfigurator.cs', 'utf8');
const presentationAsmdef = JSON.parse(readFileSync('client/WarriorRaising/Assets/Warrior/Runtime/Presentation/Presentation.asmdef', 'utf8'));
const playModeAsmdef = JSON.parse(readFileSync('client/WarriorRaising/Assets/Warrior/Tests/PlayMode/Tests.PlayMode.asmdef', 'utf8'));
const applicationAsmdef = JSON.parse(readFileSync('client/WarriorRaising/Assets/Warrior/Runtime/Application/Application.asmdef', 'utf8'));
const playModeBuildModifier = readFileSync('client/WarriorRaising/Assets/Warrior/Tests/EditMode/CleanAndroidTestPlayerBuildModifier.cs', 'utf8');
const safeAreaRoot = readFileSync('client/WarriorRaising/Assets/Warrior/Runtime/Presentation/SafeAreaRoot.cs', 'utf8');

test('dev Android build uses the saved Bootstrap scene without regenerating it', () => {
  expect(buildSource).not.toContain('L5ShellSceneBuilder.Build();');
});

test('dev Android build produces a non-development player', () => {
  expect(buildSource).toContain('options = BuildOptions.None');
  expect(buildSource).not.toContain('BuildOptions.Development');
  expect(buildSource).not.toContain('BuildOptions.AllowDebugging');
});

test('Android project configuration compiles before Unity switches away from a non-Android target', () => {
  expect(configuratorSource).toMatch(/#if UNITY_ANDROID\s+using Unity\.Android\.Types;\s+#endif/);
  expect(configuratorSource).toMatch(/static T6ProjectConfigurator\(\)\s*\{\s*#if UNITY_ANDROID\s*Apply\(\);\s*#endif\s*\}/);
  expect(configuratorSource).toContain('#if !UNITY_ANDROID');
});

test('Android architecture configuration uses the guarded UnityEditor property type', () => {
  expect(configuratorSource).toMatch(/#if UNITY_ANDROID[\s\S]*UnityEditor\.AndroidArchitecture\.ARM64[\s\S]*#endif/);
});

test('Presentation declares the uGUI package assembly required by Android compilation', () => {
  expect(presentationAsmdef.references).toContain('UnityEngine.UI');
});

test('Application declares the Input System package assembly used by its event loop', () => {
  expect(applicationAsmdef.references).toContain('Unity.InputSystem');
});

test('Android PlayMode injects the runtime test runner once through the TestAssemblies contract', () => {
  expect(playModeAsmdef.references).not.toContain('UnityEngine.TestRunner');
  expect(playModeAsmdef.optionalUnityReferences).toEqual(['TestAssemblies']);
});

test('Android PlayMode declares NUnit as an explicit precompiled test dependency', () => {
  expect(playModeAsmdef.overrideReferences).toBe(true);
  expect(playModeAsmdef.precompiledReferences).toEqual(['nunit.framework.dll']);
});

test('Android PlayMode invalidates stale Bee IL2CPP partitions before linking', () => {
  expect(playModeBuildModifier).toContain('[assembly: TestPlayerBuildModifier');
  expect(playModeBuildModifier).toContain('BuildOptions.CleanBuildCache');
});

test('Android safe-area inset supports the API 28 project minimum', () => {
  expect(safeAreaRoot).toContain('android.os.Build$VERSION');
  expect(safeAreaRoot).toContain('SDK_INT');
  expect(safeAreaRoot).toContain('getSystemWindowInsetBottom');
  expect(safeAreaRoot).toContain('navigationBars');
});

test('Unity build backups are ignored without hiding Android metadata', () => {
  const paths = [
    'client/WarriorRaising/android/build/WarriorRaising-dev_BackUpThisFolder_ButDontShipItWithYourGame/',
    'client/WarriorRaising/android/build/output.json',
    'client/WarriorRaising/android/build/symbols.json',
  ];
  const result = spawnSync('git', ['check-ignore', '--no-index', ...paths], { encoding: 'utf8' });

  expect(result.stdout.trim().split('\n').filter(Boolean)).toEqual([paths[0]]);
});
