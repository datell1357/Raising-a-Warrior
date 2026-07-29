import { afterAll, expect, test } from "bun:test"
import { deleteApp, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { observe } from "./observation.ts"

const endpoint = "http://127.0.0.1:5007/demo-warrior-t7/asia-northeast3/claimAuthorityBaseline"
const app = initializeApp({ projectId: "demo-warrior-t7" }, "t7-callable-http")
const db = getFirestore(app)

function emulatorJwt(payload: Record<string, string | number | Record<string, string>>) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`
}

const now = Math.floor(Date.now() / 1000)
const authToken = emulatorJwt({ aud: "demo-warrior-t7", iss: "https://securetoken.google.com/demo-warrior-t7", sub: "owner", user_id: "owner", iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: "custom" } })
const versionAuthToken = emulatorJwt({ aud: "demo-warrior-t7", iss: "https://securetoken.google.com/demo-warrior-t7", sub: "owner-version", user_id: "owner-version", iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: "custom" } })
const appCheckToken = emulatorJwt({ aud: "demo-warrior-t7", iss: "https://firebaseappcheck.googleapis.com/", sub: "demo-warrior-t7", iat: now, exp: now + 3600 })

const request = (commandId: string, expectedStateVersion = "0", contentVersion = "callable-content") => ({
  commandId,
  expectedStateVersion,
  clientBuild: "t7-callable",
  contentVersion,
  payload: { kind: "noop" },
})

async function invoke(data: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ data }) })
  return { status: response.status, body: await response.json() }
}

afterAll(async () => deleteApp(app))

test.skipIf(process.env.FIRESTORE_EMULATOR_HOST === undefined)("Given callable HTTP requests When auth or App Check is absent Then the protocol rejects them without writes", { timeout: 20000 }, async () => {
  const missingAppCheck = await invoke(request("http-missing-app-check"), { Authorization: `Bearer ${authToken}` })
  expect(missingAppCheck.status).toBe(401)
  const missingAuth = await invoke(request("http-missing-auth"), { "X-Firebase-AppCheck": appCheckToken })
  expect(missingAuth.status).toBe(401)
  expect((await db.doc("commandLedger/http-missing-app-check").get()).exists).toBe(false)
  expect((await db.doc("commandLedger/http-missing-auth").get()).exists).toBe(false)
  await observe("callable-missing-credentials", "callable", { appCheckStatus: missingAppCheck.status, authStatus: missingAuth.status, ledgerWrites: false })
})

test.skipIf(process.env.FIRESTORE_EMULATOR_HOST === undefined)("Given a callable HTTP request When both synthetic emulator headers are supplied Then valid and malformed protocol outcomes are observable", async () => {
  const headers = { Authorization: `Bearer ${authToken}`, "X-Firebase-AppCheck": appCheckToken }
  const malformed = await invoke({ commandId: "http-malformed" }, headers)
  expect(malformed.status).toBe(400)
  expect((await db.doc("commandLedger/http-malformed").get()).exists).toBe(false)
  const valid = await invoke(request("http-valid"), headers)
  expect(valid.status).toBe(200)
  const conflict = await invoke({ ...request("http-valid"), clientBuild: "changed" }, headers)
  expect(conflict.body.error?.status).toBe("ALREADY_EXISTS")
  const alreadyProcessed = await invoke(request("http-after-grant", "1"), headers)
  expect(alreadyProcessed.body.error?.status).toBe("ALREADY_EXISTS")
  expect((await db.doc("commandLedger/http-after-grant").get()).exists).toBe(false)
  await db.doc("authoritySnapshots/owner-version").set({ stateVersion: "1" })
  const versionConflict = await invoke(request("http-version-conflict"), { Authorization: `Bearer ${versionAuthToken}`, "X-Firebase-AppCheck": appCheckToken })
  expect(versionConflict.body.error?.status).toBe("FAILED_PRECONDITION")
  expect((await db.doc("commandLedger/http-version-conflict").get()).exists).toBe(false)
  expect((await db.doc("commandLedger/http-valid").get()).exists).toBe(true)
  await observe("callable-domain-matrix", "callable", { validStatus: valid.status, conflict: conflict.body.error?.status === "ALREADY_EXISTS", alreadyProcessed: alreadyProcessed.body.error?.status === "ALREADY_EXISTS", versionConflict: versionConflict.body.error?.status === "FAILED_PRECONDITION" })
})
