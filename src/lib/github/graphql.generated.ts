/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** The possible viewed states of a file . */
export type FileViewedState =
  /** The file has new changes since last viewed. */
  | 'DISMISSED'
  /** The file has not been marked as viewed. */
  | 'UNVIEWED'
  /** The file has been marked as viewed. */
  | 'VIEWED';

export type MarkViewedMutationVariables = Exact<{
  pullRequestId: string | number;
  path: string;
}>;

export type MarkViewedMutation = { markFileAsViewed: { clientMutationId: string | null } | null };

export type UnmarkViewedMutationVariables = Exact<{
  pullRequestId: string | number;
  path: string;
}>;

export type UnmarkViewedMutation = {
  unmarkFileAsViewed: { clientMutationId: string | null } | null;
};

export type ViewedFilesQueryVariables = Exact<{
  owner: string;
  name: string;
  number: number;
  after?: string | null | undefined;
}>;

export type ViewedFilesQuery = {
  repository: {
    pullRequest: {
      id: string;
      files: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: Array<{ path: string; viewerViewedState: FileViewedState } | null> | null;
      } | null;
    } | null;
  } | null;
};
