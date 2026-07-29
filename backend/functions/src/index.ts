import { getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { HttpsError, onCall } from "firebase-functions/v2/https"
import { ZodError } from "zod"
import { AuthorityError, authorityRequestSchema, type AuthorityRequest, userIdSchema } from "./authority-types.js"
import { executeAuthorityCommand } from "./authority-command.js"
import { evaluateIdentityEntry, initializeGuestIdentity } from "./identity.js"
import { parseRuntimePolicy } from "./runtime-policy.js"

if (getApps().length === 0) initializeApp()

type CallableRequest = {
  readonly data: unknown
  readonly auth: { readonly uid: string } | null
}

const minimumClientVersion = "1.0.0"

function callableError(error: AuthorityError): HttpsError {
  switch (error.code) {
    case "VersionConflict":
      return new HttpsError("failed-precondition", error.code)
    case "IdempotencyConflict":
    case "AlreadyProcessed":
      return new HttpsError("already-exists", error.code)
    case "TemporarilyUnavailable":
      return new HttpsError("unavailable", error.code)
  }
}

export async function claimAuthorityBaselineHandler(request: CallableRequest) {
  if (request.auth === null) throw new HttpsError("unauthenticated", "authentication is required")
  try {
    parseRuntimePolicy(process.env)
    const uid = userIdSchema.parse(request.auth.uid)
    const data: AuthorityRequest = authorityRequestSchema.parse(request.data)
    return await executeAuthorityCommand(getFirestore(), uid, data)
  } catch (error) {
    if (error instanceof AuthorityError) throw callableError(error)
    if (error instanceof ZodError) throw new HttpsError("invalid-argument", "malformed authority request")
    throw error
  }
}

export function identityEntryPolicyHandler(request: { readonly data: unknown }) {
  parseRuntimePolicy(process.env)
  return evaluateIdentityEntry({
    clientVersion: request.data,
    minimumVersion: minimumClientVersion,
  })
}

export async function initializeGuestIdentityHandler(request: CallableRequest) {
  if (request.auth === null) throw new HttpsError("unauthenticated", "authentication is required")
  parseRuntimePolicy(process.env)
  const decision = evaluateIdentityEntry({
    clientVersion: request.data,
    minimumVersion: minimumClientVersion,
  })
  if (decision.kind === "update-required") throw new HttpsError("failed-precondition", "update-required")
  return initializeGuestIdentity(getFirestore(), request.auth.uid)
}

export const claimAuthorityBaseline = onCall({ region: "asia-northeast3", enforceAppCheck: true }, async (request) => {
  const auth = request.auth === undefined ? null : { uid: request.auth.uid }
  return claimAuthorityBaselineHandler({ data: request.data, auth })
})

export const identityEntryPolicy = onCall({ region: "asia-northeast3", enforceAppCheck: true }, async (request) => {
  return identityEntryPolicyHandler({ data: request.data })
})

export const initializeGuestIdentityCallable = onCall({ region: "asia-northeast3", enforceAppCheck: true }, async (request) => {
  const auth = request.auth === undefined ? null : { uid: request.auth.uid }
  return initializeGuestIdentityHandler({ data: request.data, auth })
})

export { evaluateIdentityEntry, executeAuthorityCommand, initializeGuestIdentity }
