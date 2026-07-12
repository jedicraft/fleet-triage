import fs from "node:fs/promises";
import path from "node:path";
import { skillDir } from "./config.js";

let cachedSkillBody: string | null = null;

export async function loadReachabilitySkillBody(): Promise<string> {
  if (cachedSkillBody) return cachedSkillBody;
  const dir = skillDir();
  const skill = await fs.readFile(path.join(dir, "SKILL.md"), "utf8");
  const reference = await fs.readFile(path.join(dir, "reference.md"), "utf8");
  cachedSkillBody = `${skill.trim()}\n\n---\n\n${reference.trim()}`;
  return cachedSkillBody;
}
