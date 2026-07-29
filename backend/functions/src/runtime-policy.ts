import { z } from "zod"

const runtimeInputSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  GCLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  FIREBASE_CONFIG: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FUNCTIONS_EMULATOR: z.string().optional(),
  FIREBASE_APPCHECK_DEBUG_TOKEN: z.string().optional(),
  FIREBASE_APP_CHECK_DEBUG_TOKEN: z.string().optional(),
  APP_CHECK_DEBUG_TOKEN: z.string().optional(),
  FIREBASE_DEBUG_TOKEN: z.string().optional(),
  FIREBASE_DEBUG_MODE: z.string().optional(),
  FIREBASE_DEBUG_FEATURES: z.string().optional(),
  WARRIOR_APP_CHECK_PROVIDER: z.string().optional(),
}).passthrough()

export class RuntimePolicyError extends Error {
  override readonly name = "RuntimePolicyError"

  constructor(readonly reason: string) {
    super(`runtime policy: ${reason}`)
  }
}

export type RuntimePolicy =
  | { readonly kind: "production"; readonly projectId: string }
  | { readonly kind: "demo-emulator"; readonly projectId: "demo-warrior-t7" }

export function parseRuntimePolicy(input: Record<string, string | undefined>): RuntimePolicy {
  const environment = runtimeInputSchema.parse(input)
  const firebaseProjectId = environment.FIREBASE_CONFIG === undefined ? undefined : z.object({ projectId: z.string().optional() }).passthrough().parse(JSON.parse(environment.FIREBASE_CONFIG)).projectId
  const projectIds = [environment.FIREBASE_PROJECT_ID, environment.GCLOUD_PROJECT, environment.GOOGLE_CLOUD_PROJECT, firebaseProjectId].filter((value): value is string => value !== undefined)
  const projectId = projectIds[0]
  const emulatorEnabled = Object.entries(environment).some(([key, value]) => value !== undefined && (key.endsWith("_EMULATOR_HOST") || key === "FUNCTIONS_EMULATOR"))
  const debugEnabled = environment.WARRIOR_APP_CHECK_PROVIDER === "debug" || environment.FIREBASE_APP_CHECK_DEBUG_TOKEN !== undefined || environment.FIREBASE_APPCHECK_DEBUG_TOKEN !== undefined || environment.APP_CHECK_DEBUG_TOKEN !== undefined || environment.FIREBASE_DEBUG_TOKEN !== undefined || environment.FIREBASE_DEBUG_MODE === "true" || environment.FIREBASE_DEBUG_FEATURES !== undefined

  if (environment.NODE_ENV === "production") {
    if (emulatorEnabled || debugEnabled || projectId === "demo-warrior-t7") throw new RuntimePolicyError("production forbids demo, debug, and emulator inputs")
    if (projectId === undefined || projectIds.some((value) => value !== projectId)) throw new RuntimePolicyError("production project identity is invalid")
    return { kind: "production", projectId: z.string().parse(projectId) }
  }

  if (projectIds.length === 0 || projectIds.some((value) => value !== "demo-warrior-t7") || environment.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8087" || environment.FUNCTIONS_EMULATOR !== "true") throw new RuntimePolicyError("demo emulator requires the fixed demo project and loopback ports")
  return { kind: "demo-emulator", projectId: "demo-warrior-t7" }
}
