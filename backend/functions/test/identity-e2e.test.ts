import { afterAll, beforeAll, expect, test } from "bun:test"
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from "firebase-admin/app"
import { getAuth as getAdminAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { deleteApp, initializeApp } from "firebase/app"
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  linkWithCredential,
  signInAnonymously,
} from "firebase/auth"
import { z } from "zod"
import {
  evaluateIdentityEntry,
  initializeGuestIdentity,
} from "../src/identity.js"

const projectId = "demo-warrior-t7"
const minimumVersion = "1.0.0"
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST
const emulatorEnabled = authHost !== undefined && firestoreHost !== undefined
const refreshResponseSchema = z.object({ id_token: z.string(), user_id: z.string() }).passthrough()

const adminApp = initializeAdminApp({ projectId }, "task-9-identity-admin")
const db = getFirestore(adminApp)
const adminAuth = getAdminAuth(adminApp)
const clientApps: ReturnType<typeof initializeApp>[] = []

function clientAuth(name: string) {
  const app = initializeApp({ apiKey: "demo-key", projectId }, name)
  clientApps.push(app)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
  return auth
}

function unsignedGoogleToken(subject: string, email: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    aud: projectId,
    email,
    exp: now + 3600,
    iat: now,
    iss: "https://accounts.google.com",
    sub: subject,
  })}.`
}

async function clearEmulators(): Promise<void> {
  await fetch(`http://${authHost}/emulator/v1/projects/${projectId}/accounts`, { method: "DELETE" })
  await fetch(`http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: "DELETE" })
}

beforeAll(async () => {
  if (emulatorEnabled) await clearEmulators()
})

afterAll(async () => {
  await Promise.all(clientApps.map(async (app) => deleteApp(app)))
  await deleteAdminApp(adminApp)
})

test("Given a below-minimum client When identity entry is evaluated Then mandatory update is required", () => {
  expect(evaluateIdentityEntry({ clientVersion: "0.9.9", minimumVersion })).toEqual({
    kind: "update-required",
    minimumVersion,
  })
})

test.skipIf(!emulatorEnabled)("Given the identity emulators When guest reconnect and Google linking run Then progress is preserved without collision overwrite", { timeout: 30_000 }, async () => {
  const beforeBlockedEntry = (await adminAuth.listUsers()).users.length
  expect(evaluateIdentityEntry({ clientVersion: "0.9.9", minimumVersion }).kind).toBe("update-required")
  expect((await adminAuth.listUsers()).users).toHaveLength(beforeBlockedEntry)

  expect(evaluateIdentityEntry({ clientVersion: minimumVersion, minimumVersion }).kind).toBe("continue")
  const guestAuth = clientAuth("task-9-guest")
  const guestCredential = await signInAnonymously(guestAuth)
  const guestUid = guestCredential.user.uid
  const initialized = await initializeGuestIdentity(db, guestUid)
  expect((await initializeGuestIdentity(db, guestUid))).toEqual(initialized)

  await db.doc(`identityProgress/${guestUid}`).update({ marker: "preserved-progress" })
  const refreshResponse = await fetch(`http://${authHost}/securetoken.googleapis.com/v1/token?key=demo-key`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: guestCredential.user.refreshToken }),
  })
  const refreshed = refreshResponseSchema.parse(await refreshResponse.json())
  expect(refreshed.user_id).toBe(guestUid)

  const invalidRefresh = await fetch(`http://${authHost}/securetoken.googleapis.com/v1/token?key=demo-key`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: "expired-token" }),
  })
  expect(invalidRefresh.status).toBe(400)
  expect((await db.doc(`identityProgress/${guestUid}`).get()).data()?.marker).toBe("preserved-progress")

  const googleCredential = GoogleAuthProvider.credential(unsignedGoogleToken("google-a", "player@example.com"))
  const linked = await linkWithCredential(guestCredential.user, googleCredential)
  expect(linked.user.uid).toBe(guestUid)
  expect((await db.doc(`identityProgress/${guestUid}`).get()).data()?.marker).toBe("preserved-progress")

  const collisionAuth = clientAuth("task-9-collision")
  const collisionGuest = await signInAnonymously(collisionAuth)
  await initializeGuestIdentity(db, collisionGuest.user.uid)
  await db.doc(`identityProgress/${collisionGuest.user.uid}`).update({ marker: "collision-progress" })
  await expect(linkWithCredential(collisionGuest.user, googleCredential)).rejects.toMatchObject({
    code: "auth/credential-already-in-use",
  })
  expect((await db.doc(`identityProgress/${guestUid}`).get()).data()?.marker).toBe("preserved-progress")
  expect((await db.doc(`identityProgress/${collisionGuest.user.uid}`).get()).data()?.marker).toBe("collision-progress")
})
