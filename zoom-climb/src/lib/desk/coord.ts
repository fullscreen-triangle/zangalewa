/**
 * Heuristic S-coord computation for a repo.
 *
 * Per the epistemology calculus, each repo lands at a point in the
 * Lagrangian agent manifold's spatial part: (S_k, S_t, S_e) ∈ [0,1]^3.
 *
 * - S_k (knowledge specificity): 0 = narrow, specific entity;
 *   1 = broad, general concept. Repos with rich metadata
 *   (description + topics) land lower; bare repos land higher.
 * - S_t (temporal entropy): 0 = recent / well-settled current work;
 *   1 = old / dormant. We map "days since last push" through a
 *   one-year half-life.
 * - S_e (evolution / transformation depth): 0 = read-only knowledge,
 *   1 = active code with high transformation surface. Mapped from
 *   reported language + size.
 *
 * These are deliberately simple v0 heuristics. The intended replacement
 * is an embedding-derived coord using a small projection head trained
 * on hand-labelled repo coordinates — that lands once we have evidence
 * the heuristic is wrong somewhere.
 */

import type { SCoord } from "@/components/render-leaves/types";
import type { GitHubRepo } from "./github";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function computeCoord(repo: GitHubRepo): SCoord {
  return {
    S_k: knowledgeSpecificity(repo),
    S_t: temporalEntropy(repo),
    S_e: evolutionDepth(repo),
  };
}

/**
 * Low S_k = narrow / specific (well-described, focused). High S_k =
 * broad / under-described (vague or scaffold).
 *
 * Specifity sources (lower S_k):
 *   - non-empty description
 *   - one or more topic tags
 *   - a primary language reported
 *
 * Each present property removes ~0.2 from a baseline of 0.8.
 */
function knowledgeSpecificity(repo: GitHubRepo): number {
  let s = 0.8;
  if (repo.description && repo.description.trim().length > 0) s -= 0.2;
  if (repo.topics.length > 0) s -= 0.2;
  if (repo.topics.length >= 3) s -= 0.1;
  if (repo.language) s -= 0.1;
  return clamp01(s);
}

/**
 * Temporal entropy: 0 = pushed today, 1 = pushed > 2 years ago,
 * smooth in between via a half-life of ~365 days.
 *
 *   S_t = 1 - exp(-days / 365)
 *
 * (Inverse exponential decay gives ~0.5 at one year, ~0.86 at two,
 * never quite reaching 1.0 — appropriate since a repo is never
 * categorically dead, just decreasingly relevant.)
 */
function temporalEntropy(repo: GitHubRepo): number {
  if (!repo.pushed_at) return 0.5;
  const days = (Date.now() - new Date(repo.pushed_at).getTime()) / ONE_DAY_MS;
  if (!Number.isFinite(days) || days < 0) return 0.0;
  return clamp01(1 - Math.exp(-days / 365));
}

/**
 * Evolution depth: 0 = pure docs / static content, 1 = actively
 * transforming codebase.
 *
 * Signals:
 *   - language reported as "Markdown" / "TeX" / null → low S_e
 *   - language is a typical systems / app language → high baseline
 *   - size (KB) > 1000 nudges S_e up (substantial code surface)
 */
function evolutionDepth(repo: GitHubRepo): number {
  const lang = (repo.language ?? "").toLowerCase();
  let s: number;
  if (!lang || lang === "markdown" || lang === "tex" || lang === "html") {
    s = 0.2;
  } else if (
    [
      "rust",
      "go",
      "c",
      "c++",
      "cpp",
      "typescript",
      "javascript",
      "python",
      "java",
      "kotlin",
      "swift",
      "ruby",
      "scala",
    ].includes(lang)
  ) {
    s = 0.6;
  } else {
    s = 0.4;
  }
  if (repo.size > 1000) s += 0.1;
  if (repo.size > 10000) s += 0.1;
  return clamp01(s);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
