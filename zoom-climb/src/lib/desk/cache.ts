/**
 * Filesystem JSON cache for the desk index.
 *
 * v0 stores the index at `<project root>/data/desk-index.json` so it
 * can be inspected directly. On Vercel the filesystem is read-only at
 * runtime, so this strategy is local-dev only — production deploy will
 * either bake the index in at build time or move it to KV storage. We
 * cross that bridge when we deploy.
 */

import { promises as fs } from "fs";
import path from "path";
import type { DeskIndex } from "./types";

const CACHE_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "desk-index.json");

export async function readIndex(): Promise<DeskIndex | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as DeskIndex;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function writeIndex(index: DeskIndex): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(index, null, 2), "utf-8");
}

export function cacheFilePath(): string {
  return CACHE_FILE;
}
