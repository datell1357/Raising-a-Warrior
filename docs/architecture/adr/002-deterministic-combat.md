<!-- adr-meta: {"id":"002-deterministic-combat","status":"accepted","decisionIds":["fixed-point-20-tick","signed-start-stage","server-replay"],"riskIds":["client-result-forgery","engine-timing-drift"],"sourceIds":["unity-fixed-updates","unity-physics-manual","unity-fixed-delta"],"claims":{"simulation":"fixed-point-20-tick","stageToken":"signed-and-bound","result":"server-bounded-replay"}} -->
# ADR 002: Deterministic Combat

## Decision
Authoritative combat uses a 20-tick fixed-point simulation. `StartStage` returns a signed token bound to account, stage, contentVersion, stateVersion, loadout hash, seed, start time, and expiry. `FinishStage` submits result and timeline hashes; the server performs bounded replay and validation before one atomic commit of progress, rewards, and ledger state.

Unity fixed-update scheduling is not proof of deterministic simulation. PhysX, render timing, frame rate, and engine scheduling are presentation concerns and are not authority; no client `victory=true` is trusted.

The following claim table is normative; prose remains explanatory.

| Claim | Value |
| --- | --- |
| simulation | fixed-point-20-tick |
| stageToken | signed-and-bound |
| result | server-bounded-replay |

## Consequences
The client can predict and render combat, but only server validation advances cells, bosses, rewards, or retries. Replay bounds, signed-stage expiry, content/loadout/state binding, and hash verification make altered or stale timelines deterministic failures with no mutation.

## Risks And Controls
Client result forgery is controlled by signed starts and server replay. Engine timing drift is controlled by fixed-point rules independent of Unity frame scheduling or PhysX execution.

## Sources
| Source ID | URL | retrievedAt |
| --- | --- | --- |
| unity-fixed-updates | https://docs.unity3d.com/6/Documentation/Manual/fixed-updates.html | 2026-07-28 |
| unity-physics-manual | https://docs.unity3d.com/6/Documentation/Manual/physics-optimization-cpu-manual-simulation.html | 2026-07-28 |
| unity-fixed-delta | https://docs.unity3d.com/6/Documentation/ScriptReference/Time-fixedDeltaTime.html | 2026-07-28 |
