import { getGitHubToken, type GitHubPullRequestRef } from './api';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

export type FileViewedState = 'VIEWED' | 'UNVIEWED' | 'DISMISSED';

export type ViewedFileState = {
  path: string;
  viewerViewedState: FileViewedState;
};

export class GitHubGraphQLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubGraphQLError';
  }
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function graphqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = await getGitHubToken();
  if (!token) {
    throw new GitHubGraphQLError('Add a GitHub token in the diffy extension popup.');
  }

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new GitHubGraphQLError(
      detail
        ? `${response.status} ${response.statusText}: ${detail}`
        : `${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as GraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new GitHubGraphQLError(payload.errors.map((error) => error.message).join('; '));
  }

  if (!payload.data) {
    throw new GitHubGraphQLError('GitHub returned an empty GraphQL response.');
  }

  return payload.data;
}

const VIEWED_FILES_QUERY = `
query ViewedFiles($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id
      files(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { path viewerViewedState }
      }
    }
  }
}`;

type ViewedFilesQueryResult = {
  repository: {
    pullRequest: {
      id: string;
      files: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: ViewedFileState[];
      };
    } | null;
  } | null;
};

export type ViewedFilesResult = {
  pullRequestId: string;
  files: ViewedFileState[];
};

/** Fetch per-file viewed state for the current viewer. Paginates until exhausted. */
export async function fetchViewedFiles(ref: GitHubPullRequestRef): Promise<ViewedFilesResult> {
  const files: ViewedFileState[] = [];
  let after: string | null = null;
  let pullRequestId = '';

  do {
    const data: ViewedFilesQueryResult = await graphqlRequest<ViewedFilesQueryResult>(
      VIEWED_FILES_QUERY,
      { owner: ref.owner, name: ref.repo, number: ref.pullNumber, after },
    );

    const pullRequest = data.repository?.pullRequest;
    if (!pullRequest) {
      throw new GitHubGraphQLError('Pull request not found.');
    }

    pullRequestId = pullRequest.id;
    files.push(...pullRequest.files.nodes);

    after = pullRequest.files.pageInfo.hasNextPage ? pullRequest.files.pageInfo.endCursor : null;
  } while (after);

  return { pullRequestId, files };
}

const MARK_FILE_VIEWED_MUTATION = `
mutation MarkViewed($pullRequestId: ID!, $path: String!) {
  markFileAsViewed(input: { pullRequestId: $pullRequestId, path: $path }) {
    clientMutationId
  }
}`;

const UNMARK_FILE_VIEWED_MUTATION = `
mutation UnmarkViewed($pullRequestId: ID!, $path: String!) {
  unmarkFileAsViewed(input: { pullRequestId: $pullRequestId, path: $path }) {
    clientMutationId
  }
}`;

export async function markFileAsViewed(pullRequestId: string, path: string): Promise<void> {
  await graphqlRequest(MARK_FILE_VIEWED_MUTATION, { pullRequestId, path });
}

export async function unmarkFileAsViewed(pullRequestId: string, path: string): Promise<void> {
  await graphqlRequest(UNMARK_FILE_VIEWED_MUTATION, { pullRequestId, path });
}
