export type GitHubTokenKind = 'fine-grained' | 'classic' | 'oauth' | 'unknown';

export const VIEWED_FILES_TOKEN_HINT =
  'The review flow requires a classic PAT (repo scope) or gh auth token after gh auth login.';

export const FINE_GRAINED_WARNING_SUMMARY =
  "Review flow won't work with fine-grained tokens — use a classic PAT (repo) or gh auth token.";

export const FINE_GRAINED_WARNING_DETAIL =
  'The review flow will not work with fine-grained tokens (github_pat_…). Use a classic PAT with repo scope, or run gh auth login then gh auth token and paste the result here. Diffs and comments still work.';

const FINE_GRAINED_PREFIX = 'github_pat_';
const CLASSIC_PREFIX = 'ghp_';
const OAUTH_PREFIX = 'gho_';

export function getTokenKind(token: string): GitHubTokenKind {
  const trimmed = token.trim();
  if (trimmed.startsWith(FINE_GRAINED_PREFIX)) {
    return 'fine-grained';
  }
  if (trimmed.startsWith(CLASSIC_PREFIX)) {
    return 'classic';
  }
  if (trimmed.startsWith(OAUTH_PREFIX)) {
    return 'oauth';
  }
  return 'unknown';
}

export function isFineGrainedToken(token: string): boolean {
  return getTokenKind(token) === 'fine-grained';
}

export function supportsReviewFlowToken(token: string): boolean {
  const kind = getTokenKind(token);
  return kind === 'classic' || kind === 'oauth';
}

export function shouldShowReviewFlowTokenWarning(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) {
    return true;
  }
  return !supportsReviewFlowToken(trimmed);
}

const VIEWED_FILES_ERROR_PATTERNS = [
  'resource not accessible',
  '403',
  'forbidden',
  'must have push access',
  'insufficient',
];

export function formatViewedFilesError(message: string): string {
  const normalized = message.toLowerCase();
  const looksLikeTokenIssue = VIEWED_FILES_ERROR_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );

  if (looksLikeTokenIssue) {
    return `${message} ${VIEWED_FILES_TOKEN_HINT}`;
  }

  return message;
}
