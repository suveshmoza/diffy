<div align="center">
  <picture>
    <img src="https://iili.io/CCRv0XV.jpg" alt="diffy" width="96" height="96">
  </picture>

  <h1>diffy</h1>

  <p><strong>Fast, full-screen PR diffs on GitHub - searchable file tree, inline review comments, split/unified layout, and 60+ themes.</strong></p>
</div>

> ⚠️ **Note:**
> Not yet published on the Chrome Web Store or Firefox Add-ons, install from source below.

**diffy** adds a `View Diff` button to GitHub pull request pages and opens the full change set in a fast, full-screen overlay powered by [Pierre Trees](https://trees.software) and [Pierre Diffs](https://diffs.com) `CodeView`.

<https://github.com/user-attachments/assets/b1bd5acb-7538-4279-8a14-e03183198c3c>

<https://github.com/user-attachments/assets/711071dc-7127-47e7-823d-2c174d6eb187>

> This project was rebuilt after seeing [Linear View Diff](https://github.com/CarterMcAlister/linear-code-review) by [Carter McAlister](https://github.com/CarterMcAlister) — a Chrome extension that adds a **View Diff** button on Linear review pages and renders linked GitHub PRs with Pierre Trees and Pierre Diffs.

## Features

- `View Diff` button injected into GitHub PR headers
- Full-screen overlay with continuous scroll through the entire PR
- Fast reopen: overlay stays warm between open/close and preserves scroll position
- File tree sidebar with search for navigating changed files in large PRs
- Review comment indicators on file tree rows (icon and count)
- **Stacked** (unified) and **Switched** (split) diff layouts
- Inline PR review comment threads rendered in the diff viewer
- Syntax highlighting with sticky file headers
- Theme picker in the extension popup (60+ Shiki themes, including GitHub light/dark variants)
- Prefetches PR diff data when you land on a PR page
- Press `Escape` to close the overlay without conflicting with page shortcuts
- Optional GitHub token via the extension popup (private repos and higher rate limits)

## Install

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/)

### Development

```bash
git clone git@github.com:suveshmoza/diffy.git
cd diffy
pnpm install
pnpm dev
```

### Build

```bash
pnpm build
```
