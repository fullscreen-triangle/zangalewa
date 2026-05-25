/**
 * Minimal GitHub REST client for the desk-index pipeline.
 *
 * Scope: list public repos for one user, fetch a README per repo.
 * No octokit dependency — direct fetch keeps the surface area tiny
 * and the dependency tree clean for the demo. Authenticated calls
 * via the `GITHUB_TOKEN` env var lift the rate limit to 5,000/hr.
 */

const GITHUB_API = "https://api.github.com";

export type GitHubRepo = {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  default_branch: string;
  pushed_at: string;
  created_at: string;
  stargazers_count: number;
  size: number;
  fork: boolean;
  archived: boolean;
  private: boolean;
  html_url: string;
};

function authHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  const base: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "zoom-climb-desk-indexer",
  };
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}

/**
 * List all public, non-archived, non-fork repos for the user. Paginates
 * automatically (100/page is the GitHub max). Returns repos sorted by
 * most recent push first.
 */
export async function listUserPublicRepos(
  username: string
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${GITHUB_API}/users/${encodeURIComponent(
      username
    )}/repos?per_page=${perPage}&page=${page}&type=owner&sort=pushed`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      throw new Error(
        `GitHub list repos failed (${res.status}): ${await res.text()}`
      );
    }
    const page_repos = (await res.json()) as GitHubRepo[];
    if (!Array.isArray(page_repos) || page_repos.length === 0) break;
    repos.push(...page_repos);
    if (page_repos.length < perPage) break;
    page += 1;
    if (page > 20) break; // safety: 2000 repos is well beyond any plausible profile
  }

  return repos.filter(
    (r) => !r.private && !r.archived && !r.fork
  );
}

/**
 * Fetch the README for a repo. Returns the decoded text, truncated to
 * `maxChars`. Returns empty string when no README exists (some repos
 * have none), instead of throwing — missing README is normal.
 */
export async function fetchReadme(
  fullName: string,
  maxChars = 2000
): Promise<string> {
  const url = `${GITHUB_API}/repos/${fullName}/readme`;
  let res: Response;
  try {
    res = await fetch(url, { headers: authHeaders() });
  } catch (e) {
    // Node's global fetch throws "TypeError: fetch failed" and stashes
    // the real error on `.cause` — preserve it so we can debug.
    const cause = (e as { cause?: unknown }).cause;
    const detail = cause instanceof Error ? cause.message : String(cause ?? e);
    throw new Error(`network error fetching readme ${fullName}: ${detail}`);
  }
  if (res.status === 404) return "";
  if (!res.ok) {
    throw new Error(
      `GitHub fetch readme failed for ${fullName} (${res.status})`
    );
  }
  const body = (await res.json()) as { content?: string; encoding?: string };
  if (!body.content || body.encoding !== "base64") return "";
  const decoded = Buffer.from(body.content, "base64").toString("utf-8");
  return stripReadme(decoded).slice(0, maxChars);
}

/**
 * Strip the noisiest parts of a README so the embedding focuses on
 * meaningful prose. Removes HTML tags, badge images, code fences,
 * raw HTML comments. The result is still recognisably the README, just
 * compressed to its semantic content.
 */
function stripReadme(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "") // HTML comments
    .replace(/<[^>]+>/g, "") // HTML tags
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // Markdown images
    .replace(/```[\s\S]*?```/g, "") // code fences
    .replace(/`[^`]+`/g, "") // inline code
    .replace(/\n{3,}/g, "\n\n") // collapse blank runs
    .trim();
}
