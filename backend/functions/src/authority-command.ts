import { createHash } from "node:crypto"
import type { Firestore } from "firebase-admin/firestore"
import { z } from "zod"
import { AuthorityError, authorityRequestSchema, authorityResponseSchema, canonicalDecimalSchema, userIdSchema, type AuthorityRequest, type AuthorityResponse } from "./authority-types.js"

const ledgerSchema = z.object({
  actorUid: z.string(),
  operation: z.literal("claim-authority-baseline/v1"),
  commandId: z.string(),
  requestHash: z.string().length(64),
  response: authorityResponseSchema,
}).strict()

const snapshotSchema = z.object({ stateVersion: canonicalDecimalSchema }).passthrough()

export type AuthorityDependencies = { readonly injectFault?: () => void }

function requestHash(request: AuthorityRequest): string {
  return createHash("sha256").update(JSON.stringify({
    expectedStateVersion: request.expectedStateVersion,
    clientBuild: request.clientBuild,
    contentVersion: request.contentVersion,
    payload: request.payload,
  })).digest("hex")
}

function increment(value: string): string {
  return (BigInt(value) + 1n).toString()
}

export async function executeAuthorityCommand(db: Firestore, uidInput: string, input: unknown, dependencies: AuthorityDependencies = {}): Promise<AuthorityResponse> {
  const uid = userIdSchema.parse(uidInput)
  const request = authorityRequestSchema.parse(input)
  const hash = requestHash(request)
  const ledger = db.doc(`commandLedger/${request.commandId}`)
  const snapshot = db.doc(`authoritySnapshots/${uid}`)
  const publicSnapshot = db.doc(`publicSnapshots/${uid}`)
  const processed = db.doc(`baselineConsumption/${uid}`)

  return db.runTransaction(async (transaction) => {
    const storedLedger = await transaction.get(ledger)
    if (storedLedger.exists) {
      const stored = ledgerSchema.parse(storedLedger.data())
      if (stored.actorUid === uid && stored.operation === "claim-authority-baseline/v1" && stored.commandId === request.commandId && stored.requestHash === hash) return stored.response
      throw new AuthorityError("IdempotencyConflict", request.commandId)
    }

    const consumed = await transaction.get(processed)
    if (consumed.exists) throw new AuthorityError("AlreadyProcessed", request.commandId)

    const storedSnapshot = await transaction.get(snapshot)
    const stateVersion = storedSnapshot.exists ? snapshotSchema.parse(storedSnapshot.data()).stateVersion : canonicalDecimalSchema.parse("0")
    if (stateVersion !== request.expectedStateVersion) throw new AuthorityError("VersionConflict", request.commandId)

    const response = authorityResponseSchema.parse({
      commandId: request.commandId,
      stateVersion: canonicalDecimalSchema.parse(increment(stateVersion)),
      serverTime: Date.now().toString(),
      walletDelta: [],
      payload: { ok: true },
      snapshotRequired: false,
    })
    transaction.create(snapshot, { stateVersion: response.stateVersion, baselineGrantCount: "1", lastCommandId: request.commandId, updatedAt: response.serverTime })
    dependencies.injectFault?.()
    transaction.create(publicSnapshot, { stateVersion: response.stateVersion, baselineGranted: true })
    transaction.create(ledger, { actorUid: uid, operation: "claim-authority-baseline/v1", commandId: request.commandId, requestHash: hash, response })
    transaction.create(processed, { commandId: request.commandId })
    return response
  })
}
