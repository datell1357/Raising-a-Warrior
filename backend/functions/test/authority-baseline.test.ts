import { expect, test } from "bun:test"
import { deleteApp, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { claimAuthorityBaselineHandler, executeAuthorityCommand } from "../src/index.ts"
import { parseRuntimePolicy } from "../src/runtime-policy.ts"
import { observe } from "./observation.ts"

const request = {
  commandId: "command-happy",
  expectedStateVersion: "0",
  clientBuild: "t7-test",
  contentVersion: "baseline-content",
  payload: { kind: "noop" },
}

test("Given production runtime inputs When debug or emulator configuration is supplied Then runtime policy rejects it", () => {
  expect(() => parseRuntimePolicy({ NODE_ENV: "production", FIREBASE_PROJECT_ID: "prod-warrior", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8087" })).toThrow("runtime policy")
})

test("Given an unauthenticated callable request When it reaches the command surface Then it is rejected", async () => {
  await expect(claimAuthorityBaselineHandler({ data: request, auth: null })).rejects.toMatchObject({ code: "unauthenticated" })
})

test("Given an authority command When no database is supplied Then the callable export remains available", () => {
  expect(executeAuthorityCommand).toBeFunction()
})

test.skipIf(process.env.FIRESTORE_EMULATOR_HOST === undefined)("Given a Firestore emulator command When it commits and retries Then snapshots projections and ledger remain effect-once", { timeout: 20000 }, async () => {
  const app = initializeApp({ projectId: "demo-warrior-t7" }, "t7-authority-test")
  const db = getFirestore(app)
  const first = await executeAuthorityCommand(db, "player-a", request)
  const retry = await executeAuthorityCommand(db, "player-a", request)

  expect(retry).toEqual(first)
  expect((await db.doc("authoritySnapshots/player-a").get()).data()?.stateVersion).toBe("1")
  expect((await db.doc("publicSnapshots/player-a").get()).data()).toEqual({ stateVersion: "1", baselineGranted: true })
  expect((await db.doc("commandLedger/command-happy").get()).exists).toBe(true)
  await expect(executeAuthorityCommand(db, "player-a", { ...request, commandId: "command-content-bypass", contentVersion: "changed-content" })).rejects.toMatchObject({ code: "AlreadyProcessed" })
  const concurrent = { ...request, commandId: "command-concurrent" }
  const concurrentResults = await Promise.all([executeAuthorityCommand(db, "player-concurrent", concurrent), executeAuthorityCommand(db, "player-concurrent", concurrent)])
  expect(concurrentResults[0]).toEqual(concurrentResults[1])
  expect((await db.collection("commandLedger").get()).docs.filter((item) => item.id === "command-concurrent").length).toBe(1)
  const distinct = await Promise.allSettled([executeAuthorityCommand(db, "player-distinct", { ...request, commandId: "command-distinct-a" }), executeAuthorityCommand(db, "player-distinct", { ...request, commandId: "command-distinct-b" })])
  expect(distinct.filter((item) => item.status === "fulfilled").length).toBe(1)
  expect(distinct.filter((item) => item.status === "rejected").length).toBe(1)
  await expect(executeAuthorityCommand(db, "player-fault", { ...request, commandId: "command-fault" }, { injectFault: () => { throw new AuthorityFaultError() } })).rejects.toBeInstanceOf(AuthorityFaultError)
  expect((await db.doc("authoritySnapshots/player-fault").get()).exists).toBe(false)
  expect((await db.doc("publicSnapshots/player-fault").get()).exists).toBe(false)
  expect((await db.doc("commandLedger/command-fault").get()).exists).toBe(false)
  await observe("transaction-effect-once-fault", "transaction", { exactRetry: true, concurrentExactRetry: true, concurrentDistinctIds: true, faultSnapshotAbsent: true, faultPublicAbsent: true, faultLedgerAbsent: true })
  await deleteApp(app)
})

class AuthorityFaultError extends Error {
  override readonly name = "AuthorityFaultError"

  constructor() {
    super("injected transaction fault")
  }
}
