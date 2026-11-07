import { RequestError } from '@octokit/request-error';

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isGitHubRateLimitError(error: unknown): boolean {
  if (error instanceof RequestError) {
    return error.status === 429;
  }

  if (typeof error === 'string' && error.includes('429')) {
    return true;
  }

  if (error instanceof Error && error.message.includes('429')) {
    return true;
  }

  return false;
}
