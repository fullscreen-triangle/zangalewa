/**
 * The contract between Zangalewa and everything else.
 *
 * Zangalewa is the OS's only AI module: it turns instructions into DSL code
 * and does nothing else. It does not execute, does not schedule, does not
 * decide where the code belongs, and does not judge whether the code is
 * semantically right — that verdict belongs to consumers downstream, never
 * to the writer. The single judgement it IS entitled to make is syntactic:
 * did the module's own compiler accept this?
 *
 * These types are the shared surface with the eventual Rust implementation.
 * Both must satisfy the same shapes and pass the same fixtures; a change
 * here is a change to both.
 */

/** A compiler's verdict on one candidate. Normalized across every DSL. */
export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  message: string;
  /** 1-based, when the compiler reports one. */
  line?: number | null;
}

/**
 * One DSL the generator can target.
 *
 * `validate` is the module's REAL compiler, normalized. `moduleId` is who
 * executes the code once it reaches the OS (recorded here, never acted on
 * by this module). `packId` names the grounding material.
 */
export interface DslEntry {
  id: string;
  label: string;
  validate: (source: string) => ValidationResult;
  moduleId: string;
  packId: string;
  /**
   * Whether this DSL's compiler accepts a fragment as well as a whole
   * program. Line-oriented DSLs (vaHera) do; DSLs with program structure
   * or accumulating REPL semantics (SCOPE) may not, in which case chunk
   * extent needs a different validation call than script extent.
   */
  acceptsFragment: boolean;
}

/**
 * How much code to write. Same competence, different extent — the
 * instructions decide which, and the compiler judges either identically.
 *
 *  - "script" : a complete standalone program for one module, the thing an
 *               informed user would have hand-written.
 *  - "chunk"  : one subtask's share, a fragment destined for a node that
 *               may carry several chunks in several DSLs.
 */
export type Extent = "script" | "chunk";

export interface GenerateRequest {
  dslId: string;
  instructions: string;
  extent?: Extent;
  /** Repair attempts after the first try. Default 3. */
  maxRepairs?: number;
  /** How many independent drafts to attempt. Every one that compiles is kept. */
  drafts?: number;
  /** Explicit provider/model override; otherwise selection is automatic. */
  model?: string;
  /**
   * Wall-clock budget for the whole request, across drafts and repairs.
   * Defaults to just under the API route's limit. Raise it for a slow local
   * model when the caller is not a serverless route.
   */
  timeoutMs?: number;
}

/** One candidate that survived its compiler. */
export interface Chunk {
  code: string;
  /** Which provider/model wrote it. */
  model: string;
  /** Repair rounds needed before it compiled. 0 = first try. */
  repairs: number;
  /** Wall-clock ms to produce, including repairs. */
  elapsedMs: number;
}

/** One candidate the compiler refused, kept for diagnostics. */
export interface RejectedChunk {
  code: string;
  model: string;
  repairs: number;
  errors: ValidationError[];
}

/**
 * Every draft the compiler accepted — not a winner.
 *
 * The runtime executes every chunk on a node and judges nothing, so
 * collapsing accepted drafts to a single "best" one would be this module
 * making exactly the semantic call it is not entitled to make. Two chunks
 * that both compile are two valid realisations; which one mattered is
 * settled downstream by whether the node's values propagated.
 */
export interface GenerateResult {
  ok: boolean;
  dslId: string;
  extent: Extent;
  chunks: Chunk[];
  rejected: RejectedChunk[];
  /** Present when generation failed outright (no provider, all drafts dead). */
  error?: string;
  /** Distinguishes "no provider" from "compiler refused everything". */
  stage?: "provider" | "compiler";
  /**
   * Providers that died before the compiler ever saw their output — a dead
   * key, an unreachable host, a timeout. Reported even on success, because
   * a partial bag looks identical to a full one otherwise, and "one of your
   * two models has a revoked key" is exactly the thing that stays invisible
   * for weeks if it is only surfaced on total failure.
   */
  providerErrors?: { model: string; message: string }[];
}
