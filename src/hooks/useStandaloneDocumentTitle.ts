import { useEffect } from 'react';

import { isStandaloneOverlay } from '@/lib/overlay/standalone';

const DEFAULT_TITLE = 'diffy';
const MAX_TITLE_LENGTH = 80;

function formatTabTitle(title: string, isReady: boolean): string {
  const trimmed = title.trim();
  const display =
    trimmed.length > MAX_TITLE_LENGTH ? `${trimmed.slice(0, MAX_TITLE_LENGTH - 1)}…` : trimmed;
  return isReady ? display : `[Fetching] ${display}`;
}

type UseStandaloneDocumentTitleOptions = {
  pullRequestTitle: string | undefined;
  fallbackTitle: string | undefined;
  isReady: boolean;
};

export function useStandaloneDocumentTitle({
  pullRequestTitle,
  fallbackTitle,
  isReady,
}: UseStandaloneDocumentTitleOptions): void {
  useEffect(() => {
    if (!isStandaloneOverlay()) {
      return;
    }

    const title = pullRequestTitle ?? fallbackTitle ?? DEFAULT_TITLE;
    document.title = formatTabTitle(title, isReady);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [pullRequestTitle, fallbackTitle, isReady]);
}
