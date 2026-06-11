# diffy

**diffy** is a browser extension that adds a **View Diff** button to GitHub pull requests, then renders even huge PRs in a full-screen overlay, **far faster** than GitHub’s built-in Files changed view.

Built using [Pierre Trees](https://trees.software) and [Pierre Diffs](https://diffs.com) `CodeView`.

## Features

- **View Diff** button injected into GitHub PR headers
- File tree sidebar for navigating changed files in large PRs
- Unified and split diff layouts with syntax highlighting
- Optional GitHub token via the extension popup (private repos and higher rate limits)

## Stack

- [WXT](https://wxt.dev/) + React + TypeScript
- [@pierre/trees](https://trees.software) + [@pierre/diffs](https://diffs.com)

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## GitHub token

Open the extension popup to save an optional GitHub fine-grained PAT. Recommended scope: read-only access to **Contents** and **Pull requests** for the target repositories.
