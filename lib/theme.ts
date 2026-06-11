export type GitHubTheme = 'light' | 'dark';

export function getGitHubTheme(): GitHubTheme {
  const mode = document.documentElement.dataset.colorMode?.toLowerCase();
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }

  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getDiffTheme(theme: GitHubTheme): 'pierre-light' | 'pierre-dark' {
  return theme === 'light' ? 'pierre-light' : 'pierre-dark';
}
