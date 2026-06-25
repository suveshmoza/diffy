import type { FileViewedState } from '@/lib/github/graphql';

export type ViewedProgress = {
  viewed: number;
  total: number;
};

/** A file counts toward progress only when fully VIEWED. DISMISSED (changed since view) does not. */
export function isViewedComplete(state: FileViewedState | undefined): boolean {
  return state === 'VIEWED';
}

export function computeViewedProgress(
  paths: readonly string[],
  viewedByPath: ReadonlyMap<string, FileViewedState>,
): ViewedProgress {
  let viewed = 0;
  for (const path of paths) {
    if (isViewedComplete(viewedByPath.get(path))) {
      viewed += 1;
    }
  }

  return { viewed, total: paths.length };
}

/**
 * Return the next file path that is not fully viewed, starting after `fromPath`
 * and wrapping around. Returns null when every file is viewed.
 */
export function findNextUnviewedPath(
  orderedPaths: readonly string[],
  viewedByPath: ReadonlyMap<string, FileViewedState>,
  fromPath: string | null,
): string | null {
  if (orderedPaths.length === 0) {
    return null;
  }

  const startIndex = fromPath ? orderedPaths.indexOf(fromPath) : -1;

  for (let offset = 1; offset <= orderedPaths.length; offset += 1) {
    const candidate =
      orderedPaths[(startIndex + offset + orderedPaths.length) % orderedPaths.length];
    if (!isViewedComplete(viewedByPath.get(candidate))) {
      return candidate;
    }
  }

  return null;
}
