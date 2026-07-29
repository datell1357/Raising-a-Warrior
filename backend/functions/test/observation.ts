import { appendFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"

export async function observe(id: string, category: "rules" | "transaction" | "callable", values: Record<string, string | number | boolean>): Promise<void> {
  const directory = process.env.T7_EVIDENCE_DIR
  if (directory === undefined) return
  const path = resolve(directory, "observations.jsonl")
  await mkdir(dirname(path), { recursive: true })
  await appendFile(path, `${JSON.stringify({ id, category, observedAt: new Date().toISOString(), values })}\n`, "utf8")
}
