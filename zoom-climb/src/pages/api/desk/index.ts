import type { NextApiRequest, NextApiResponse } from "next";

import { fetchReadme, listUserPublicRepos } from "@/lib/desk/github";
import { EMBEDDING_MODEL, embedText } from "@/lib/desk/huggingface";
import { computeCoord } from "@/lib/desk/coord";
import { cacheFilePath, readIndex, writeIndex } from "@/lib/desk/cache";
import type {
  DeskIndex,
  IndexBuildStats,
  RepoIndexEntry,
} from "@/lib/desk/types";

/**
 * /api/desk/index
 *
 * GET /api/desk/index             → return the cached index (build it
 *                                    first if missing).
 * GET /api/desk/index?rebuild=1   → force a full rebuild; reuses cached
 *                                    embeddings for repos whose `pushed_at`
 *                                    has not changed.
 * GET /api/desk/index?stats=1     → return only the build stats + a tiny
 *                                    summary (no embedding vectors).
 *
 * v0 hard-codes the GitHub username (`fullscreen-triangle`) — that's the
 * subject of the demo, not configurable yet.
 *
 * The full build takes ~60–120 seconds on a cold HF model, dominated by
 * the 1-req/sec embedding throttle. Subsequent invocations with no
 * pushed_at changes finish in <1s.
 */

export const config = {
  // Vercel Pro/Enterprise allow up to 300s; free tier is 10s. v0 is
  // local-only, so this matters only for production.
  maxDuration: 300,
};

const USERNAME = "fullscreen-triangle";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET only" });
  }

  const rebuild = req.query.rebuild === "1" || req.query.rebuild === "true";
  const statsOnly = req.query.stats === "1" || req.query.stats === "true";

  try {
    const existing = await readIndex();
    if (existing && !rebuild) {
      return res.status(200).json(statsOnly ? summary(existing) : existing);
    }

    const { index, stats } = await buildIndex(USERNAME, existing);
    await writeIndex(index);

    if (statsOnly) {
      return res.status(200).json({ ...summary(index), build: stats });
    }
    return res.status(200).json({ ...index, _build: stats });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(502).json({
      error: `desk index build failed: ${message}`,
      cache_path: cacheFilePath(),
    });
  }
}

function summary(index: DeskIndex) {
  return {
    username: index.username,
    generated_at: index.generated_at,
    repo_count: index.repo_count,
    embedding_model: index.embedding_model,
    repos: index.repos.map((r) => ({
      full_name: r.full_name,
      name: r.name,
      language: r.language,
      pushed_at: r.pushed_at,
      coord: r.coord,
      topics: r.topics,
      description: r.description,
    })),
  };
}

/**
 * Build the index. Reuses cached embeddings whenever `pushed_at` is
 * unchanged for a repo (no point re-embedding the same README).
 */
async function buildIndex(
  username: string,
  previous: DeskIndex | null
): Promise<{ index: DeskIndex; stats: IndexBuildStats }> {
  const t0 = Date.now();
  const errors: IndexBuildStats["errors"] = [];

  const repos = await listUserPublicRepos(username);

  const previousByName = new Map<string, RepoIndexEntry>();
  if (previous) {
    for (const r of previous.repos) previousByName.set(r.full_name, r);
  }

  const entries: RepoIndexEntry[] = [];
  let embedded = 0;
  let cachedSkipped = 0;

  for (const repo of repos) {
    try {
      const cached = previousByName.get(repo.full_name);
      const unchanged =
        cached &&
        cached.pushed_at === repo.pushed_at &&
        cached.embedding.length > 0;

      let readme_excerpt = cached?.readme_excerpt ?? "";
      let embedding = cached?.embedding ?? [];

      if (!unchanged) {
        readme_excerpt = await fetchReadme(repo.full_name);
        const corpus = buildEmbeddingCorpus(
          repo.name,
          repo.description,
          repo.topics,
          repo.language,
          readme_excerpt
        );
        embedding = await embedText(corpus, false);
        embedded += 1;
      } else {
        cachedSkipped += 1;
      }

      entries.push({
        full_name: repo.full_name,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        topics: repo.topics,
        default_branch: repo.default_branch,
        pushed_at: repo.pushed_at,
        created_at: repo.created_at,
        stargazers_count: repo.stargazers_count,
        size: repo.size,
        is_fork: repo.fork,
        is_archived: repo.archived,
        readme_excerpt,
        embedding,
        coord: computeCoord(repo),
        html_url: repo.html_url,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ repo: repo.full_name, message });
    }
  }

  const index: DeskIndex = {
    username,
    generated_at: new Date().toISOString(),
    repo_count: entries.length,
    embedding_model: EMBEDDING_MODEL,
    repos: entries,
  };

  const stats: IndexBuildStats = {
    fetched: repos.length,
    embedded,
    cached_skipped: cachedSkipped,
    errors,
    duration_ms: Date.now() - t0,
  };

  return { index, stats };
}

/**
 * Build the text we actually embed: name, primary language, topic tags,
 * description, README excerpt. Order matters less for sentence-level
 * embeddings than total content, but we lead with the most discriminating
 * signals (name + topics) for robustness if the README is empty.
 */
function buildEmbeddingCorpus(
  name: string,
  description: string | null,
  topics: string[],
  language: string | null,
  readme: string
): string {
  const parts: string[] = [];
  parts.push(`Repository: ${name}`);
  if (language) parts.push(`Primary language: ${language}`);
  if (topics.length > 0) parts.push(`Topics: ${topics.join(", ")}`);
  if (description) parts.push(`Description: ${description}`);
  if (readme.trim().length > 0) parts.push(`README: ${readme}`);
  return parts.join("\n");
}
