export type GitHubPermalink = {
  owner: string;
  repo: string;
  kind: 'blob' | 'blame';
  ref: string;
  path: string;
  startLine: number;
  endLine: number;
  href: string;
};

const LINE_HASH_PATTERN = /^#L(\d+)(?:-L(\d+))?$/i;

/**
 * Parse a GitHub blob/blame permalink that includes a line anchor (`#L10` or `#L10-L15`).
 * Links without a line hash return null so callers can render the URL as a normal link.
 */
export function parseGitHubPermalink(href: string): GitHubPermalink | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }

  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    return null;
  }

  const lineMatch = LINE_HASH_PATTERN.exec(url.hash);
  if (!lineMatch) {
    return null;
  }

  const startRaw = Number.parseInt(lineMatch[1] ?? '', 10);
  const endRaw = lineMatch[2] != null ? Number.parseInt(lineMatch[2], 10) : startRaw;

  if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw) || startRaw < 1 || endRaw < 1) {
    return null;
  }

  const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
  if (segments.length < 5) {
    return null;
  }

  const [owner, repo, kind, ref, ...pathParts] = segments;
  if (
    owner == null ||
    repo == null ||
    ref == null ||
    (kind !== 'blob' && kind !== 'blame') ||
    pathParts.length === 0
  ) {
    return null;
  }

  let path: string;
  try {
    path = pathParts.map((part) => decodeURIComponent(part)).join('/');
  } catch {
    return null;
  }

  if (path.length === 0) {
    return null;
  }

  const startLine = Math.min(startRaw, endRaw);
  const endLine = Math.max(startRaw, endRaw);

  return {
    owner: decodeURIComponent(owner),
    repo: decodeURIComponent(repo),
    kind,
    ref: decodeURIComponent(ref),
    path,
    startLine,
    endLine,
    href: url.toString(),
  };
}
