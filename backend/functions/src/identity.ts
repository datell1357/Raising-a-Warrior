import type { Firestore } from "firebase-admin/firestore"
import { z } from "zod"
import { userIdSchema } from "./authority-types.js"

const semanticVersionSchema = z.string().regex(/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/)
const identityEntrySchema = z.object({
  clientVersion: semanticVersionSchema,
  minimumVersion: semanticVersionSchema,
}).strict()
const identityProgressSchema = z.object({
  uid: userIdSchema,
  stateVersion: z.literal("0"),
  marker: z.string().min(1).max(128),
}).strict()

export type IdentityEntryDecision =
  | { readonly kind: "continue"; readonly minimumVersion: string }
  | { readonly kind: "update-required"; readonly minimumVersion: string }

export type IdentityProgress = z.infer<typeof identityProgressSchema>

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number)
  const rightParts = right.split(".").map(Number)
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

export function evaluateIdentityEntry(input: unknown): IdentityEntryDecision {
  const value = identityEntrySchema.parse(input)
  return compareVersions(value.clientVersion, value.minimumVersion) < 0
    ? { kind: "update-required", minimumVersion: value.minimumVersion }
    : { kind: "continue", minimumVersion: value.minimumVersion }
}

export async function initializeGuestIdentity(db: Firestore, uidInput: string): Promise<IdentityProgress> {
  const uid = userIdSchema.parse(uidInput)
  const reference = db.doc(`identityProgress/${uid}`)
  return db.runTransaction(async (transaction) => {
    const stored = await transaction.get(reference)
    if (stored.exists) return identityProgressSchema.parse(stored.data())
    const progress = identityProgressSchema.parse({
      uid,
      stateVersion: "0",
      marker: "guest-initial",
    })
    transaction.create(reference, progress)
    return progress
  })
}
