import fs from "node:fs/promises";
import path from "node:path";
import { triageStateDir } from "./config.js";

interface TriageStateFile {
  handledAlertIds: string[];
  updatedAt: string;
}

async function statePath(): Promise<string> {
  const dir = triageStateDir();
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, "handled.json");
}

export async function loadHandledAlertIds(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(await statePath(), "utf8");
    const parsed = JSON.parse(raw) as TriageStateFile;
    return new Set(parsed.handledAlertIds ?? []);
  } catch {
    return new Set();
  }
}

export async function markAlertsHandled(alertIds: string[]): Promise<void> {
  const existing = await loadHandledAlertIds();
  for (const id of alertIds) existing.add(id);
  const payload: TriageStateFile = {
    handledAlertIds: [...existing].sort(),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(await statePath(), JSON.stringify(payload, null, 2), "utf8");
}
