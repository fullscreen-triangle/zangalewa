/**
 * Shared types for the desk-index pipeline.
 *
 * A `RepoIndexEntry` is the framework's view of one GitHub repository:
 * metadata pulled from the GitHub API, a README excerpt, an embedding
 * vector from HF inference, and an S-coord (S_k, S_t, S_e) derived from
 * the metadata. The `DeskIndex` is the union of these — the entire
 * substrate the interceptor navigates.
 *
 * Wire format is plain JSON via JSON.stringify — no special encoding.
 */

import type { SCoord } from "@/components/render-leaves/types";

export type RepoIndexEntry = {
  /** e.g. "fullscreen-triangle/buhera" */
  full_name: string;
  /** e.g. "buhera" */
  name: string;
  /** repo short description; null when GitHub has none */
  description: string | null;
  /** primary language reported by GitHub, e.g. "Rust", "TypeScript" */
  language: string | null;
  /** GitHub topic tags */
  topics: string[];
  /** default branch (usually "main") */
  default_branch: string;
  /** ISO timestamp of last push */
  pushed_at: string;
  /** ISO timestamp of repo creation */
  created_at: string;
  stargazers_count: number;
  /** size in KB as reported by GitHub */
  size: number;
  is_fork: boolean;
  is_archived: boolean;
  /** README content, stripped of code-fences, truncated */
  readme_excerpt: string;
  /** embedding vector from BAAI/bge-large-en-v1.5; 1024-dim */
  embedding: number[];
  /** S-coord derived from metadata */
  coord: SCoord;
  /** human-facing URL */
  html_url: string;
};

export type DeskIndex = {
  username: string;
  /** ISO timestamp of last successful full build */
  generated_at: string;
  repo_count: number;
  embedding_model: string;
  repos: RepoIndexEntry[];
};

export type IndexBuildStats = {
  fetched: number;
  embedded: number;
  cached_skipped: number;
  errors: { repo: string; message: string }[];
  duration_ms: number;
};
