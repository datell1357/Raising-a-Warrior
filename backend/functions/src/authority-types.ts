import { z } from "zod"

export const canonicalDecimalSchema = z.string().regex(/^(0|[1-9][0-9]*)$/).brand<"CanonicalDecimal">()
export const commandIdSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).brand<"CommandId">()
export const userIdSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).brand<"UserId">()

export const authorityRequestSchema = z.object({
  commandId: commandIdSchema,
  expectedStateVersion: canonicalDecimalSchema,
  clientBuild: z.string().min(1).max(128),
  contentVersion: z.string().min(1).max(128).regex(/^[a-zA-Z0-9._-]+$/),
  payload: z.object({ kind: z.literal("noop") }).strict(),
}).strict()

export const authorityResponseSchema = z.object({
  commandId: commandIdSchema,
  stateVersion: canonicalDecimalSchema,
  serverTime: z.string().regex(/^(0|[1-9][0-9]*)$/),
  walletDelta: z.array(z.never()),
  payload: z.object({ ok: z.literal(true) }).strict(),
  snapshotRequired: z.literal(false),
}).strict()

export type AuthorityRequest = z.infer<typeof authorityRequestSchema>
export type AuthorityResponse = z.infer<typeof authorityResponseSchema>
export type UserId = z.infer<typeof userIdSchema>

export const authorityErrorCodes = ["VersionConflict", "IdempotencyConflict", "AlreadyProcessed", "TemporarilyUnavailable"] as const
export type AuthorityErrorCode = typeof authorityErrorCodes[number]

export class AuthorityError extends Error {
  override readonly name = "AuthorityError"

  constructor(readonly code: AuthorityErrorCode, readonly commandId: string) {
    super(code)
  }
}
