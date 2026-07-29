import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { afterAll, beforeAll, expect, test } from "bun:test"
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing"
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore"
import { observe } from "./observation.ts"

const environment = await initializeTestEnvironment({
  projectId: "demo-warrior-t7",
  firestore: {
    host: "127.0.0.1",
    port: 8087,
    rules: await readFile(resolve(import.meta.dirname, "../../firestore.rules"), "utf8"),
  },
})

beforeAll(async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "authoritySnapshots/rules-owner"), { stateVersion: "1" })
    await setDoc(doc(context.firestore(), "publicSnapshots/rules-owner"), { uid: "rules-owner", stateVersion: "1" })
  })
})

afterAll(async () => environment.cleanup())

test("Given T7 rules When clients access snapshots Then owner and public single gets are the only allowed reads", async () => {
  const owner = environment.authenticatedContext("rules-owner").firestore()
  const other = environment.authenticatedContext("rules-other").firestore()
  const anonymous = environment.unauthenticatedContext().firestore()

  await assertSucceeds(getDoc(doc(owner, "authoritySnapshots/rules-owner")))
  await assertFails(getDoc(doc(other, "authoritySnapshots/rules-owner")))
  await assertSucceeds(getDoc(doc(anonymous, "publicSnapshots/rules-owner")))
  await assertFails(getDocs(collection(owner, "authoritySnapshots")))
  await assertFails(setDoc(doc(owner, "authoritySnapshots/rules-owner"), { stateVersion: "2" }))
  await assertFails(getDoc(doc(owner, "commandLedger/command-happy")))
  await observe("rules-negative-boundaries", "rules", { ownerGet: true, crossUidDenied: true, listDenied: true, directWriteDenied: true, ledgerDenied: true })
  expect(true).toBe(true)
})
