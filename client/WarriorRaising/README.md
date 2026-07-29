# WarriorRaising T6 Unity Android Contract

This folder defines the exact T6 Unity 6000.5.4f1 Android shell contract. L2 supplies independent repository parsing and policy validation; it deliberately does not create Unity project artifacts. The next artifact-owning lane must create the declared paths exactly.

T6 requires:
- Unity `6000.5.4f1`
- ARM64-only IL2CPP Android builds at API 36
- AAB output with public symbols
- the pinned Addressables, Android Addressables, Input System, Localization, Test Framework, and UGUI `2.5.0` packages declared in the policy
- one Bootstrap scene and exactly nine declared asmdefs
- `Tests.EditMode` and `Tests.PlayMode` declare only `TestAssemblies` as optional Unity references

T6 forbids:
- iOS release targets
- Play Feature Delivery / `com.unity.modules.pfd`
- runtime-to-test assembly references
- extra asmdefs, asmrefs, unpinned packages, and undeclared scenes

Assembly contract:
- `Core` -> `[]`
- `Domain` -> `Core`
- `Application` -> `Core`, `Domain`
- `Combat` -> `Core`, `Domain`
- `Content` -> `Core`, `Domain`
- `Platform` -> `Core`, `Domain`, `Application`
- `Presentation` -> `Core`, `Domain`, `Application`, `Combat`, `Content`
- `Tests.EditMode` -> all seven runtime assemblies, `Editor` only
- `Tests.PlayMode` -> all seven runtime assemblies, editor-discoverable with an Android-only test class

`asmdef-policy.json` is an auditable declaration, not authorization for files on disk. The repository model independently reads actual asmdefs, Unity settings, package data, scenes, Addressables, and PAD metadata before the policy compares them with the fixed T6 contract.
