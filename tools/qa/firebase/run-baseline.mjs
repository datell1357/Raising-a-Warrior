import { spawnSync } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "../../..")
const run = new Date().toISOString().replace(/[-:.]/g, "")
const evidence = resolve(root, `.omo/evidence/implementation/${run}/firebase/a1/task-7`)
const ports = [5007, 8087, 4407, 4507, 9150]

function occupiedPorts() {
  return ports.filter((port) => spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).status === 0)
}

async function writeJson(name, value) {
  await writeFile(resolve(evidence, name), `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function execute(command, args, env) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8", env, timeout: 600000 })
}

async function main() {
  await mkdir(evidence, { recursive: true })
  const before = occupiedPorts()
  if (before.length > 0) throw new Error(`reserved ports are occupied: ${before.join(",")}`)
  const env = { PATH: `${resolve(root, "node_modules/node/bin")}:${resolve(root, "node_modules/.bin")}:${process.env.PATH ?? ""}`, HOME: process.env.HOME ?? "", GCLOUD_PROJECT: "demo-warrior-t7", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8087", FUNCTIONS_EMULATOR: "true" }
  const build = execute("bun", ["run", "build:functions"], env)
  const command = `T7_EVIDENCE_DIR='${evidence}' bun test tools/qa/firebase/config-contract.test.mjs backend/functions/test --reporter=junit --reporter-outfile='${resolve(evidence, "firebase-junit.xml")}'`
  const result = build.status === 0 ? execute("firebase", ["--project", "demo-warrior-t7", "emulators:exec", command], env) : build
  const after = occupiedPorts()
  const receipt = { command, exitCode: result.status, signal: result.signal, error: result.error?.message ?? null, portsBefore: before, portsAfter: after }
  await writeFile(resolve(evidence, "emulator.log"), `${result.stdout ?? ""}\n${result.stderr ?? ""}`, "utf8")
  const observations = (await readFile(resolve(evidence, "observations.jsonl"), "utf8")).trim().split("\n").map(JSON.parse)
  const requiredScenarioIds = ["rules-negative-boundaries", "transaction-effect-once-fault", "callable-missing-credentials", "callable-domain-matrix"]
  if (requiredScenarioIds.some((id) => !observations.some((item) => item.id === id))) throw new Error("observation scenario coverage is incomplete")
  if (observations.some((item) => typeof item.observedAt !== "string" || item.observedAt.length < 20)) throw new Error("observation freshness is invalid")
  await writeJson("rules-negative.json", observations.filter((item) => item.category === "rules"))
  await writeJson("transaction-faults.json", observations.filter((item) => item.category === "transaction"))
  await writeJson("callable-observations.json", observations.filter((item) => item.category === "callable"))
  await writeJson("command-log.json", { build: { exitCode: build.status }, ...receipt, observedScenarioCount: observations.length })
  const artifacts = ["firebase-junit.xml", "rules-negative.json", "transaction-faults.json", "callable-observations.json", "command-log.json", "emulator.log"]
  await writeJson("artifact-manifest.json", Object.fromEntries(await Promise.all(artifacts.map(async (name) => [name, createHash("sha256").update(await readFile(resolve(evidence, name))).digest("hex")]))))
  await writeJson("cleanup-receipt.json", { status: result.status === 0 && after.length === 0 ? "PASS" : "FAIL", portsClosed: after.length === 0, credentialsUsed: Object.keys(env).some((key) => /TOKEN|CREDENTIAL|SECRET|KEY/.test(key)) })
  if (result.error || result.status !== 0 || after.length > 0) process.exitCode = result.status ?? 1
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
