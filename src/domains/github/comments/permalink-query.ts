import type { DiffsThemeNames, ThemedToken } from '@pierre/diffs';
import { queryOptions } from '@tanstack/react-query';

import { fetchRepoFileBytes } from '@/domains/github/blobs';
import { highlightCodeSlice } from '@/domains/github/comments/highlight-code-source';
import type { GitHubPermalink } from '@/domains/github/comments/parse-github-permalink';

export type PermalinkFileSlice = {
  path: string;
  lines: readonly (readonly ThemedToken[])[];
  startLine: number;
  endLine: number;
  fg?: string;
};

export function permalinkFileQueryOptions(permalink: GitHubPermalink, theme: DiffsThemeNames) {
  return queryOptions({
    queryKey: [
      'github-permalink',
      permalink.owner,
      permalink.repo,
      permalink.ref,
      permalink.path,
      permalink.startLine,
      permalink.endLine,
      theme,
    ] as const,
    queryFn: async (): Promise<PermalinkFileSlice> => {
      const file = await fetchRepoFileBytes(
        { owner: permalink.owner, repo: permalink.repo },
        permalink.path,
        permalink.ref,
      );
      const source = new TextDecoder('utf-8').decode(file.bytes).replace(/\r\n/g, '\n');
      const highlighted = await highlightCodeSlice({
        source,
        path: permalink.path,
        startLine: permalink.startLine,
        endLine: permalink.endLine,
        theme,
      });

      return {
        path: permalink.path,
        lines: highlighted.lines,
        startLine: highlighted.startLine,
        endLine: highlighted.endLine,
        ...(highlighted.fg != null ? { fg: highlighted.fg } : {}),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
