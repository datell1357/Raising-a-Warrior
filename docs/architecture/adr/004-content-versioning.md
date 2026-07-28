<!-- adr-meta: {"id":"004-content-versioning","status":"accepted","decisionIds":["immutable-content","optimistic-state","catalog-offline-cap"],"riskIds":["catalog-rollback","stale-client"],"sourceIds":["firestore-transactions"],"claims":{"content":"immutable","state":"optimistic-versioned","offlineCap":"immutable-catalog-only"}} -->
# ADR 004: Content Versioning

## Decision
Content versions, catalogs, and manifests are immutable. Mutable player/authority state uses optimistic state versions. Offline settlement takes its cap only from the immutable catalog field `offlineRewardCapSeconds`; this ADR defines no fixed numeric cap. Settlement persists its basis, applied cap, and content version.

Content activation and rollback require compatibility checks, immutable manifest references, and a clientBuild gate. Stale or incompatible clients are blocked or routed to the approved update path instead of being silently reinterpreted.

The following claim table is normative; prose remains explanatory.

| Claim | Value |
| --- | --- |
| content | immutable |
| state | optimistic-versioned |
| offlineCap | immutable-catalog-only |

## Consequences
Rewards, odds, costs, unlocks, and offline settlement remain reproducible against a recorded catalog version. Rollback activates a compatible prior immutable manifest, never mutates history.

## Risks And Controls
Catalog rollback is controlled by compatibility validation. Stale clients are controlled by content/state version conflicts and clientBuild gates.

## Sources
| Source ID | URL | retrievedAt |
| --- | --- | --- |
| firestore-transactions | https://firebase.google.com/docs/firestore/manage-data/transactions | 2026-07-28 |
