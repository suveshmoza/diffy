<div align="center">
  <picture>
    <img src="https://iili.io/CCRv0XV.jpg" alt="diffy" width="96" height="96">
  </picture>

  <h1>diffy</h1>

  <p><strong>Fast, full-screen PR diffs on GitHub - file tree, syntax highlighting, split/unified layout.</strong></p>
</div>

> ⚠️ **Note:**
> Not yet published on the Chrome Web Store or Firefox Add-ons, install from source below.

**diffy** adds a `View Diff` button to GitHub pull request pages and opens the full change set in a fast, full-screen overlay powered by [Pierre Trees](https://trees.software) and [Pierre Diffs](https://diffs.com) `CodeView`.



https://github.com/user-attachments/assets/b1bd5acb-7538-4279-8a14-e03183198c3c



https://github.com/user-attachments/assets/711071dc-7127-47e7-823d-2c174d6eb187



## Features

- `View Diff` button injected into GitHub PR headers
- Full-screen overlay with continuous scroll through the entire PR
- File tree sidebar for navigating changed files in large PRs
- **Stacked** (unified) and **Switched** (split) diff layouts
- Syntax highlighting with sticky file headers
- Matches GitHub light/dark theme automatically
- Prefetches PR diff data when you land on a PR page
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
