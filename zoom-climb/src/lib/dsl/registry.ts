/**
 * The DSL registry — validator adapters plus per-DSL metadata.
 *
 * Every Buhera module carries its own DSL with its own compiler, and those
 * compilers disagree on their return shape: some return {valid, errors},
 * some {ok, errors}, some throw. Each adapter here normalizes one of them
 * to a single contract so the generate -> validate -> repair loop stays
 * DSL-agnostic:
 *
 *     validate(source) -> { ok, errors: [{ message, line? }] }
 *
 * The validator is the ground truth. This module ships no facts about what
 * good code looks like — it proposes code and lets the DSL's real compiler
 * judge. A generated chunk is valid iff the module's own compiler accepts it.
 *
 * Adding a DSL is one entry plus its normalizer. Nothing in the generator
 * changes.
 */

import { parseVahera } from "./vahera";
import type { DslEntry, ValidationResult } from "./types";

/**
 * Pull a 1-based line number out of a thrown parser message of the form
 * "line N: ...". Returns null when the message carries no line marker.
 */
function lineFromMessage(message: string): number | null {
  const m = /(?:^|\b)line\s+(\d+)\b/i.exec(message || "");
  return m ? parseInt(m[1], 10) : null;
}

/**
 * vaHera — `parseVahera` THROWS on the first invalid line, embedding
 * "line N:" in the message. Parsing is pure (no kernel needed), so this is
 * a safe check without any execution.
 */
export function validateVahera(source: string): ValidationResult {
  try {
    parseVahera(source);
    return { ok: true, errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [{ message, line: lineFromMessage(message) }] };
  }
}

/**
 * The registry.
 *
 * vaHera is first because it is the one DSL whose compiler is pure and
 * portable. Turbulance (graffiti/lang/parser.ts), shapeshifter
 * (lavoisier/shapeshifter/compiler.js), SCOPE and purpose are added here as
 * their compilers are wired in — each is one entry plus a normalizer.
 *
 * `acceptsFragment` is not cosmetic: vaHera is line-oriented with no program
 * structure, so a chunk parses exactly as a script does. A DSL with block
 * structure or accumulating REPL semantics will not have that property, and
 * chunk-extent generation for it needs a different validation call.
 */
export const DSL_REGISTRY: Record<string, DslEntry> = {
  vahera: {
    id: "vahera",
    label: "vaHera",
    validate: validateVahera,
    moduleId: "vahera",
    packId: "vahera",
    acceptsFragment: true,
  },
};

export function listDsls(): DslEntry[] {
  return Object.values(DSL_REGISTRY);
}

export function getDsl(dslId: string): DslEntry | null {
  return Object.prototype.hasOwnProperty.call(DSL_REGISTRY, dslId)
    ? DSL_REGISTRY[dslId]
    : null;
}

/**
 * Validate against the named DSL's real compiler. Throws on an unknown DSL
 * id — that is a programming error, categorically different from invalid
 * source, which returns {ok:false}.
 */
export function validate(dslId: string, source: string): ValidationResult {
  const dsl = getDsl(dslId);
  if (!dsl) throw new Error(`unknown DSL: "${dslId}"`);
  return dsl.validate(source);
}
