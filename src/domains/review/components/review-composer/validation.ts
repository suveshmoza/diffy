type ComposerValidatorCopy = {
  hasToken: boolean;
  empty: string;
  missingToken: string;
};

/** Shared validation order for all review composers: non-empty, then token. */
export function createComposerValidator({ hasToken, empty, missingToken }: ComposerValidatorCopy) {
  return (trimmedBody: string): string | null => {
    if (!trimmedBody) {
      return empty;
    }
    if (!hasToken) {
      return missingToken;
    }
    return null;
  };
}
