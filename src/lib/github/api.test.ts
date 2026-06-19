import { describe, expect, it } from 'vitest';

import {
  buildPatchFromFiles,
  buildSyntheticRenamePatch,
  getNextLink,
  getPullRequestContentCacheKey,
  getPullRequestRefPrefix,
  GitHubPullRequestFile,
  isGitHubRateLimitError,
  parseGitHubPullRequestUrl,
  wrapGitHubFilePatch,
} from './api';

describe('parseGitHubPullRequestUrl', () => {
  it('parses a valid GitHub PR URL', () => {
    const result = parseGitHubPullRequestUrl('https://github.com/owner/repo/pull/123');
    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      pullNumber: 123,
      url: 'https://github.com/owner/repo/pull/123',
    });
  });
  it('returns null for a non-PR URL', () => {
    expect(parseGitHubPullRequestUrl('https://github.com/owner/repo')).toBeNull();
  });
  it('returns null for null input', () => {
    expect(parseGitHubPullRequestUrl(null)).toBeNull();
  });
  it('returns null for an empty string', () => {
    expect(parseGitHubPullRequestUrl('')).toBeNull();
  });
});

describe('isGitHubRateLimitError', () => {
  it('returns true for a string containing "429"', () => {
    expect(isGitHubRateLimitError('429 Too Many Requests')).toBe(true);
    expect(isGitHubRateLimitError('some 429 error')).toBe(true);
  });

  it('returns true for an Error with "429" in its message', () => {
    expect(isGitHubRateLimitError(new Error('429 Too Many Requests'))).toBe(true);
    expect(
      isGitHubRateLimitError(new Error('GitHub API request failed (429 Too Many Requests)')),
    ).toBe(true);
  });

  it('returns false for a string without "429"', () => {
    expect(isGitHubRateLimitError('403 Forbidden')).toBe(false);
    expect(isGitHubRateLimitError('')).toBe(false);
  });

  it('returns false for an Error without "429"', () => {
    expect(isGitHubRateLimitError(new Error('404 Not Found'))).toBe(false);
  });

  it('returns false for non-string, non-Error input', () => {
    expect(isGitHubRateLimitError(null)).toBe(false);
    expect(isGitHubRateLimitError(undefined)).toBe(false);
    expect(isGitHubRateLimitError(429)).toBe(false);
    expect(isGitHubRateLimitError({})).toBe(false);
  });
});

describe('getNextLink', () => {
  it('extracts the next URL from a Link header with rel="next"', () => {
    const header =
      '<https://api.github.com/repos/foo/bar/pulls/1/comments?per_page=100&page=2>; rel="next", <https://api.github.com/repos/foo/bar/pulls/1/comments?per_page=100&page=3>; rel="last"';
    expect(getNextLink(header)).toBe(
      'https://api.github.com/repos/foo/bar/pulls/1/comments?per_page=100&page=2',
    );
  });
  it('returns null when there is no next link', () => {
    const header =
      '<https://api.github.com/repos/foo/bar/pulls/1/comments?per_page=100&page=2>; rel="last"';
    expect(getNextLink(header)).toBeNull();
  });
  it('returns null for an empty string', () => {
    expect(getNextLink('')).toBeNull();
  });
  it('returns null for null input', () => {
    expect(getNextLink(null)).toBeNull();
  });
  it('handles multiple attribute after the URL', () => {
    const header = `<https://api.github.com/user/repos?page=3&per_page=100>; rel="next"; label="foo"`;
    expect(getNextLink(header)).toBe('https://api.github.com/user/repos?page=3&per_page=100');
  });
});

describe('wrapGitHubFilePatch', () => {
  const addedFile: GitHubPullRequestFile = {
    sha: 'abc123',
    filename: 'src/new.ts',
    status: 'added',
    additions: 1,
    deletions: 0,
    changes: 1,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: '@@ -0,0 +1 @@\n+const x = 1;\n',
  };

  it('produces a "new file" header for added files', () => {
    const result = wrapGitHubFilePatch(addedFile);
    expect(result).toBe(
      'diff --git a/src/new.ts b/src/new.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src/new.ts\n@@ -0,0 +1 @@\n+const x = 1;\n',
    );
  });

  it('produces a "deleted file" header for removed files', () => {
    const file: GitHubPullRequestFile = {
      ...addedFile,
      status: 'removed',
      filename: 'src/old.ts',
      patch: '@@ -1 +0,0 @@\n-const x = 1;\n',
    };
    const result = wrapGitHubFilePatch(file);
    expect(result).toBe(
      'diff --git a/src/old.ts b/src/old.ts\ndeleted file mode 100644\n--- a/src/old.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-const x = 1;\n',
    );
  });

  it('uses previous_filename for the old path in renamed files', () => {
    const file: GitHubPullRequestFile = {
      ...addedFile,
      status: 'renamed',
      filename: 'src/new.ts',
      previous_filename: 'src/old.ts',
      patch: '@@ -1 +1 @@\n-const x = 1;\n+const y = 2;\n',
    };
    const result = wrapGitHubFilePatch(file);
    expect(result).toBe(
      'diff --git a/src/old.ts b/src/new.ts\n--- a/src/old.ts\n+++ b/src/new.ts\n@@ -1 +1 @@\n-const x = 1;\n+const y = 2;\n',
    );
  });

  it('produces the same header format for copied files as renamed', () => {
    const file: GitHubPullRequestFile = {
      ...addedFile,
      status: 'copied',
      filename: 'src/new.ts',
      previous_filename: 'src/old.ts',
      patch: '@@ -1 +1 @@\n+const y = 2;\n',
    };
    const result = wrapGitHubFilePatch(file);
    expect(result).toBe(
      'diff --git a/src/old.ts b/src/new.ts\n--- a/src/old.ts\n+++ b/src/new.ts\n@@ -1 +1 @@\n+const y = 2;\n',
    );
  });

  it('falls back to filename when previous_filename is undefined (modified)', () => {
    const file: GitHubPullRequestFile = {
      ...addedFile,
      status: 'modified',
      filename: 'src/file.ts',
      previous_filename: undefined,
      patch: '@@ -1,3 +1,4 @@\n foo\n-bar\n+baz\n',
    };
    const result = wrapGitHubFilePatch(file);
    expect(result).toBe(
      'diff --git a/src/file.ts b/src/file.ts\n--- a/src/file.ts\n+++ b/src/file.ts\n@@ -1,3 +1,4 @@\n foo\n-bar\n+baz\n',
    );
  });

  it('uses previous_filename when set on a modified file', () => {
    const file: GitHubPullRequestFile = {
      ...addedFile,
      status: 'modified',
      filename: 'src/new.ts',
      previous_filename: 'src/old.ts',
      patch: '@@ -1,3 +1,4 @@\n foo\n-bar\n+baz\n',
    };
    const result = wrapGitHubFilePatch(file);
    expect(result).toBe(
      'diff --git a/src/old.ts b/src/new.ts\n--- a/src/old.ts\n+++ b/src/new.ts\n@@ -1,3 +1,4 @@\n foo\n-bar\n+baz\n',
    );
  });
});

describe('buildSyntheticRenamePatch', () => {
  const file: GitHubPullRequestFile = {
    sha: 'abc123',
    additions: 1,
    deletions: 0,
    changes: 0,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    status: 'renamed',
    filename: 'src/new.ts',
    previous_filename: 'src/old.ts',
    patch: undefined,
  };

  it('produces a "synthetic rename patch" for a renamed file', () => {
    const result = buildSyntheticRenamePatch(file);
    expect(result).toBe(
      'diff --git a/src/old.ts b/src/new.ts\nsimilarity index 100%\nrename from src/old.ts\nrename to src/new.ts\n',
    );
  });

  it('produces a "synthetic copied patch" for a copied file', () => {
    const result = buildSyntheticRenamePatch({
      ...file,
      status: 'copied',
    });
    expect(result).toBe(
      'diff --git a/src/old.ts b/src/new.ts\nsimilarity index 100%\ncopy from src/old.ts\ncopy to src/new.ts\n',
    );
  });

  it('returns a null result for a non-renamed file', () => {
    const result = buildSyntheticRenamePatch({
      ...file,
      status: 'modified',
    });
    expect(result).toBeNull();
  });

  it('returns a null result for a file with changes', () => {
    const result = buildSyntheticRenamePatch({
      ...file,
      changes: 1,
    });
    expect(result).toBeNull();
  });
});

describe('buildPatchFromFiles', () => {
  const files: GitHubPullRequestFile[] = [
    {
      sha: 'abc123',
      filename: 'src/new.ts',
      status: 'added',
      additions: 1,
      deletions: 0,
      changes: 1,
      blob_url: '',
      raw_url: '',
      contents_url: '',
      patch: '@@ -0,0 +1 @@\n+const x = 1;\n',
    },
    {
      sha: 'abc123',
      filename: 'src/old.ts',
      status: 'removed',
      additions: 0,
      deletions: 1,
      changes: 1,
      blob_url: '',
      raw_url: '',
      contents_url: '',
      patch: '@@ -1 +0,0 @@\n-const x = 1;\n',
    },
    {
      sha: 'abc123',
      filename: 'src/file.ts',
      status: 'modified',
      additions: 0,
      deletions: 0,
      changes: 1,
      blob_url: '',
      raw_url: '',
      contents_url: '',
      patch: '@@ -1,3 +1,4 @@\n foo\n-bar\n+baz\n',
    },
    {
      sha: 'abc123',
      filename: 'src/old.ts',
      status: 'renamed',
      additions: 0,
      deletions: 0,
      changes: 0,
      blob_url: '',
      raw_url: '',
      contents_url: '',
      patch: '@@ -1 +1 @@\n-const x = 1;\n+const y = 2;\n',
    },
  ];

  it('produces a patch from a list of files', () => {
    const patch = buildPatchFromFiles(files);
    expect(patch).toBe(
      'diff --git a/src/new.ts b/src/new.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src/new.ts\n@@ -0,0 +1 @@\n+const x = 1;\n' +
        '\ndiff --git a/src/old.ts b/src/old.ts\ndeleted file mode 100644\n--- a/src/old.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-const x = 1;\n' +
        '\ndiff --git a/src/file.ts b/src/file.ts\n--- a/src/file.ts\n+++ b/src/file.ts\n@@ -1,3 +1,4 @@\n foo\n-bar\n+baz\n' +
        '\ndiff --git a/src/old.ts b/src/old.ts\n--- a/src/old.ts\n+++ b/src/old.ts\n@@ -1 +1 @@\n-const x = 1;\n+const y = 2;\n',
    );
  });
});

describe('getPullRequestRefPrefix', () => {
  it('returns owner/repo#number', () => {
    expect(getPullRequestRefPrefix({ owner: 'Foo', repo: 'Bar', pullNumber: 42, url: '' })).toBe(
      'foo/bar#42',
    );
  });

  it('lowercases owner and repo', () => {
    expect(getPullRequestRefPrefix({ owner: 'UPPER', repo: 'MIXED', pullNumber: 1, url: '' })).toBe(
      'upper/mixed#1',
    );
  });
});

describe('getPullRequestContentCacheKey', () => {
  it('returns prefix@sha', () => {
    expect(
      getPullRequestContentCacheKey({ owner: 'o', repo: 'r', pullNumber: 7, url: '' }, 'abc123'),
    ).toBe('o/r#7@abc123');
  });
});
