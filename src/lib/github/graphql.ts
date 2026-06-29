import { getGitHubToken, type GitHubPullRequestRef } from './api';
import { githubFetch } from './github-fetch';
import type {
  FileViewedState,
  MarkViewedMutation,
  MarkViewedMutationVariables,
  UnmarkViewedMutation,
  UnmarkViewedMutationVariables,
  ViewedFilesQuery,
  ViewedFilesQueryVariables,
} from './graphql.generated';
import { updateRateLimitFromResponse } from './octokit';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

const viewedFilesQuery = `query ViewedFiles($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id
      files(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          path
          viewerViewedState
        }
      }
    }
  }
}`;

const markViewedMutation = `mutation MarkViewed($pullRequestId: ID!, $path: String!) {
  markFileAsViewed(input: { pullRequestId: $pullRequestId, path: $path }) {
    clientMutationId
  }
}`;

const unmarkViewedMutation = `mutation UnmarkViewed($pullRequestId: ID!, $path: String!) {
  unmarkFileAsViewed(input: { pullRequestId: $pullRequestId, path: $path }) {
    clientMutationId
  }
}`;

export type { FileViewedState };

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

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: Array<{ message: string }>;
};

async function graphqlRequest<TData, TVariables extends Record<string, unknown>>(
  query: string,
  variables: TVariables,
): Promise<TData> {
  const token = await getGitHubToken();
  if (!token) {
    throw new GitHubGraphQLError('Add a GitHub token in the diffy extension popup.');
  }

  const response = await githubFetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  updateRateLimitFromResponse(response);

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new GitHubGraphQLError(
      detail
        ? `${response.status} ${response.statusText}: ${detail}`
        : `${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as GraphQLResponse<TData>;
  if (payload.errors?.length) {
    throw new GitHubGraphQLError(payload.errors.map((error) => error.message).join('; '));
  }

  if (!payload.data) {
    throw new GitHubGraphQLError('GitHub returned an empty GraphQL response.');
  }

  return payload.data;
}

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
    const variables: ViewedFilesQueryVariables = {
      owner: ref.owner,
      name: ref.repo,
      number: ref.pullNumber,
      after,
    };

    const data = await graphqlRequest<ViewedFilesQuery, ViewedFilesQueryVariables>(
      viewedFilesQuery,
      variables,
    );

    const pullRequest = data.repository?.pullRequest;
    if (!pullRequest) {
      throw new GitHubGraphQLError('Pull request not found.');
    }

    pullRequestId = pullRequest.id;

    for (const node of pullRequest.files?.nodes ?? []) {
      if (node?.path && node.viewerViewedState) {
        files.push({ path: node.path, viewerViewedState: node.viewerViewedState });
      }
    }

    const pageInfo = pullRequest.files?.pageInfo;
    after = pageInfo?.hasNextPage ? (pageInfo.endCursor ?? null) : null;
  } while (after);

  return { pullRequestId, files };
}

export async function markFileAsViewed(pullRequestId: string, path: string): Promise<void> {
  const variables: MarkViewedMutationVariables = { pullRequestId, path };
  await graphqlRequest<MarkViewedMutation, MarkViewedMutationVariables>(
    markViewedMutation,
    variables,
  );
}

export async function unmarkFileAsViewed(pullRequestId: string, path: string): Promise<void> {
  const variables: UnmarkViewedMutationVariables = { pullRequestId, path };
  await graphqlRequest<UnmarkViewedMutation, UnmarkViewedMutationVariables>(
    unmarkViewedMutation,
    variables,
  );
}
