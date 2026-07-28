# WarriorRaising Client Boundary

T5 owns the client boundary contract only. This folder defines the canonical Unity assembly policy for the future client, but it is not a Unity project and does not contain runtime project scaffolding yet.

T6 creates the Unity 6 Android shell against this contract.

Allowed at T5:
- policy documentation
- canonical assembly dependency rules

Not allowed at T5:
- iOS
- gameplay implementation
- Firebase writes from `Presentation`
- package manifests
- scenes
- actual SDK configuration
- any actual `.asmdef` files
- `Assets/`, `Packages/`, or `ProjectSettings/`

Assembly contract:
- `Core` -> `[]`
- `Domain` -> `Core`
- `Application` -> `Core`, `Domain`
- `Combat` -> `Core`, `Domain`
- `Content` -> `Core`, `Domain`
- `Platform` -> `Core`, `Domain`, `Application`
- `Presentation` -> `Core`, `Domain`, `Application`, `Combat`, `Content`
- `Tests` -> all seven runtime assemblies

The JSON policy in this folder is the machine-readable source of truth. Future actual asmdefs must match it exactly.
