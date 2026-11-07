import { queryOptions } from '@tanstack/react-query';

import { fetchRepoFileBytes } from '@/domains/github/blobs';
import type { GitHubPermalink } from '@/domains/github/comments/parse-github-permalink';

export type PermalinkFileSlice = {
  path: string;
  lines: string[];
  startLine: number;
  endLine: number;
};

export function permalinkFileQueryOptions(permalink: GitHubPermalink) {
  return queryOptions({
    queryKey: [
      'github-permalink',
      permalink.owner,
      permalink.repo,
      permalink.ref,
      permalink.path,
      permalink.startLine,
      permalink.endLine,
    ] as const,
    queryFn: async (): Promise<PermalinkFileSlice> => {
      const file = await fetchRepoFileBytes(
        { owner: permalink.owner, repo: permalink.repo },
        permalink.path,
        permalink.ref,
      );
      const text = new TextDecoder('utf-8').decode(file.bytes);
      const allLines = text.replace(/\r\n/g, '\n').split('\n');
      const startIndex = Math.max(0, permalink.startLine - 1);
      const endIndex = Math.min(allLines.length, permalink.endLine);
      const lines = allLines.slice(startIndex, endIndex);

      if (lines.length === 0) {
        throw new Error('Permalink line range is outside the file');
      }

      return {
        path: permalink.path,
        lines,
        startLine: startIndex + 1,
        endLine: startIndex + lines.length,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
