import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { expect, test } from "bun:test"

const root = resolve(import.meta.dirname, "../../..")

async function json(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"))
}

test("Given the T7 authority baseline When Firebase configuration is read Then demo-only pins and emulator ports are exact", async () => {
  const [rootPackage, functionsPackage, firebase, aliases] = await Promise.all([
    json("package.json"),
    json("backend/functions/package.json"),
    json("firebase.json"),
    json(".firebaserc"),
  ])

  expect(rootPackage.devDependencies["firebase-tools"]).toBe("15.24.0")
  expect(rootPackage.scripts["build:functions"]).toBe("bun run --cwd backend/functions build")
  expect(rootPackage.scripts["test:firebase-baseline"]).toBe("bun test tools/qa/firebase/config-contract.test.mjs backend/functions/test")
  expect(rootPackage.scripts["evidence:firebase-baseline"]).toBe("node tools/qa/firebase/run-baseline.mjs")
  expect(functionsPackage.engines).toEqual({ node: "22" })
  expect(functionsPackage.dependencies).toEqual({
    "firebase-admin": "14.2.0",
    "firebase-functions": "7.3.2",
    zod: "4.4.3",
  })
  expect(functionsPackage.devDependencies).toEqual({
    "@firebase/rules-unit-testing": "5.0.1",
    firebase: "12.16.0",
  })
  expect(firebase).toEqual({
    functions: { source: "backend/functions", predeploy: ["bun run build:functions"] },
    firestore: { rules: "backend/firestore.rules", indexes: "backend/firestore.indexes.json" },
    emulators: {
      singleProjectMode: true,
      ui: { enabled: false },
      functions: { host: "127.0.0.1", port: 5007 },
      auth: { host: "127.0.0.1", port: 9099 },
      firestore: { host: "127.0.0.1", port: 8087 },
      hub: { host: "127.0.0.1", port: 4407 },
      logging: { host: "127.0.0.1", port: 4507 },
    },
  })
  expect(aliases).toEqual({ projects: { default: "demo-warrior-t7" } })
})
