import fs from "node:fs/promises";
import path from "node:path";
import { fixturesDir, advisoryInboxDir } from "./config.js";
import type { WebhookFixture } from "./types.js";

export async function loadFixture(name: string): Promise<WebhookFixture> {
  const filePath = path.join(fixturesDir(), `${name}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as WebhookFixture;
}

export async function loadAdvisoryInbox(): Promise<WebhookFixture> {
  const filePath = path.join(advisoryInboxDir(), "pending.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as WebhookFixture;
}
