/**
 * Knowledge packs — the grounding material injected into generation.
 *
 * A pack is a directory of Markdown holding one DSL's grammar and worked
 * examples. Packs carry EXAMPLES AND GRAMMAR, not domain facts: this module
 * writes code, and what it needs to know is how the language is spelled,
 * not what the science means. Grounding it in the meaning of the values its
 * code touches would be handing it a semantic role it is not entitled to.
 *
 * Layout:
 *   knowledge-packs/<pack-id>/
 *     manifest.json
 *     <files listed in manifest>
 *
 * Server-only: reads from disk. Loaded lazily, cached for the process.
 */

import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "knowledge-packs");

interface PackFile {
  path: string;
  description?: string;
}

interface PackManifest {
  id: string;
  name: string;
  short_label?: string;
  summary?: string;
  files?: PackFile[];
  _dir: string;
}

let _registry: PackManifest[] | null = null;

function loadRegistry(): PackManifest[] {
  if (_registry) return _registry;
  _registry = [];
  if (!fs.existsSync(ROOT)) return _registry;

  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(ROOT, entry.name, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      manifest._dir = path.join(ROOT, entry.name);
      _registry.push(manifest);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`failed to load knowledge pack at ${manifestPath}: ${msg}`);
    }
  }
  return _registry;
}

/** Concatenated Markdown for one pack, or null if it does not exist. */
export function loadPackContent(packId: string): string | null {
  const pack = loadRegistry().find((p) => p.id === packId);
  if (!pack) return null;

  const sections: string[] = [];
  if (pack.summary) sections.push(pack.summary);

  for (const file of pack.files || []) {
    const filePath = path.join(pack._dir, file.path);
    if (!fs.existsSync(filePath)) {
      sections.push(`<!-- missing file: ${file.path} -->`);
      continue;
    }
    sections.push(fs.readFileSync(filePath, "utf8"));
  }
  return sections.join("\n\n");
}

/** Grounding block for the system prompt, or "" when the pack is missing. */
export function buildPackContext(packId: string): string {
  const content = loadPackContent(packId);
  if (!content) return "";
  return ["# Language Reference", "", content].join("\n");
}

export function packExists(packId: string): boolean {
  return loadRegistry().some((p) => p.id === packId);
}
