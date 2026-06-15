<div align="center">
  <picture>
    <img src="https://iili.io/CCRv0XV.jpg" alt="diffy" width="96" height="96">
  </picture>

  <h1>diffy</h1>

<strong>The missing PR review experience on GitHub</strong>

<p>Full-screen diffs, searchable file tree, inline comments, split/unified layout, 100+ languages, and 12 themes.</p>
</div>

**diffy** adds a **View Diff** button to GitHub pull requests so you can review the entire change set in one fast, full-screen view - with a searchable file tree, inline review comments, split or unified layout, syntax highlighting for 100+ languages, and 12 themes. Powered by [Pierre Trees](https://trees.software) and [Pierre Diffs](https://diffs.com).

<https://github.com/user-attachments/assets/0a37798f-da98-46e1-a200-187290414452>

> **Launching soon** on the Chrome Web Store and Firefox Add-ons. Install from source below in the meantime.

> Inspired by [Linear View Diff](https://github.com/CarterMcAlister/linear-code-review) by [Carter McAlister](https://github.com/CarterMcAlister) - a Chrome extension that adds a **View Diff** button on Linear review pages and renders linked GitHub PRs with Pierre Trees and Pierre Diffs.

## Features

- **One-click access** - a **View Diff** button on every GitHub pull request
- **Full-screen diffs** - scroll through the entire PR in one continuous view
- **Fast and smooth** - opens quickly and remembers where you left off
- **File tree with search** - jump to any changed file, even in huge PRs
- **Review comments inline** - read existing threads right in the diff
- **Comment from the diff** - leave inline comments and reply without leaving the viewer
- **Split or unified layout** - switch between side-by-side and stacked views
- **Syntax highlighting** - 100+ languages with clear, colorized diffs and sticky file headers
- **12 themes** - Pierre dark/light, GitHub, Catppuccin, Dracula, Nord, Tokyo Night, and more
- **Private repo support** - add a GitHub token in the extension popup when needed

## Why diffy?

GitHub's **Files changed** tab works well for most pull requests. It starts to break down on PRs with large code changes — hundreds of files, big diffs, or heavy review threads - where you hit documented diff limits and long-standing UX friction.

| The GitHub problem                                                                                                                               | How diffy helps                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **"Diff too large to display"** - GitHub caps total PR diffs at 20,000 lines / 1 MB and refuses to render beyond that                            | Fetches changes through the GitHub API and renders them in a dedicated viewer, bypassing the web UI diff renderer |
| **300+ changed files** — the unified diff endpoint returns a 406 error; GitHub tells you to use the files API instead                            | Uses the paginated files API to load every changed file, then assembles the full diff                             |
| **"Load diff" on every large file** - GitHub only auto-loads the first 400 lines / 20 KB per file; you click to load the rest one file at a time | Shows full file patches in one continuous scroll - no per-file load buttons                                       |
| **File-by-file review** - expand, collapse, and jump between files; easy to lose context across a big PR                                         | One continuous full-PR view with a searchable file tree to jump anywhere instantly                                |
| **Slow, freezing Files changed tab** - reviewers report UI lag, high memory use, and multi-second freezes even on medium PRs                     | A lightweight overlay with fast rendering - stays responsive where GitHub's tab struggles                         |
| **Comments scattered across tabs** - unresolved threads are hard to track in Conversation vs Files changed                                       | Inline review comment threads rendered directly on the lines you're reading                                       |

## How it works

1. Open any pull request on GitHub - diffy adds a **View Diff** button to the page.
2. Click it to open a full-screen diff viewer with every changed file in one scrollable view.
3. Use the file tree on the left to search and jump between files.
4. Read and leave review comments directly on the lines you're looking at.

## Project structure

```text
diffy/
├── src/
│   ├── assets/                  # Extension icon source (logo.png)
│   ├── components/              # React UI for the diff overlay
│   │   ├── App.tsx              # Overlay shell: loading, error, and diff states
│   │   ├── DiffOverlay.tsx      # Main viewer: CodeView, file tree, review threads
│   │   ├── DiffOverlayHeader.tsx # PR title, layout toggle, theme picker, close
│   │   ├── FileTreePanel.tsx    # Searchable file tree with comment badges
│   │   └── ReviewComment*.tsx   # Inline comment, reply, and edit composers
│   ├── entrypoints/
│   │   ├── github-pr.content/   # Content script entry (button injection, prefetch)
│   │   │   ├── index.tsx        # Page lifecycle, overlay mount/unmount
│   │   │   └── overlay.tsx      # React root for the overlay (ESM bundle target)
│   │   └── popup/               # Extension popup (GitHub token settings)
│   ├── hooks/                   # React hooks (CodeView, themes, worker pool readiness)
│   ├── lib/                     # Core logic
│   │   ├── github/              # GitHub API, page integration, comment rendering
│   │   ├── overlay/             # Content script ↔ iframe messaging
│   │   ├── diff/                # Worker, languages, themes, layout prefs
│   │   ├── code-view/           # PR patches → Pierre CodeView items
│   │   ├── review/              # Review threads, formatting, reply UI
│   │   ├── file-tree/           # File tree panel helpers
│   │   └── theming/             # Tree chrome theme resolution
│   ├── modules/
│   │   └── shiki-pruner.ts      # Prunes unused Shiki chunks after production builds
│   ├── providers/               # React context (diff theme, resolved theme, worker sync)
│   └── types/                   # Ambient type declarations
└── wxt.config.ts                # Manifest, permissions, Vite plugins
```

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

`pnpm dev` watches for changes and rebuilds the extension. Reload the unpacked extension in your browser after each rebuild.

### Build

```bash
pnpm build              # Chrome
pnpm build:firefox      # Firefox
pnpm zip                # Packaged Chrome zip
pnpm zip:firefox        # Packaged Firefox zip
```

### Load in Chrome

1. Build the extension (or keep `pnpm dev` running):

   ```bash
   pnpm build
   ```

2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `.output/chrome-mv3` folder.

### Load in Firefox

1. Build for Firefox:

   ```bash
   pnpm build:firefox
   ```

2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**.
4. Select any file inside `.output/firefox-mv2` (for example `manifest.json`).

To remove the extension, use **Remove** on the extension card (Chrome) or reload the temporary add-on page (Firefox).

## GitHub token

The extension popup lets you save an optional personal access token. A token is required for:

- **Private repositories**.
- **Higher API rate limits**.
- **Posting review comments**.

After saving a token, reload any open PR tabs for it to take effect.

## Syntax highlighting languages

Syntax highlighting is powered by [Shiki](https://shiki.style/) via Pierre Diffs. The extension currently ships **107 Shiki grammars** (100+ languages, including common aliases like `js`/`javascript` and `py`/`python`). Which languages are included is controlled by a **blocklist**, every Shiki bundled language is enabled except those listed in **blocklist**.

### Files

| File                                 | Editable?               | Role                                                                       |
| ------------------------------------ | ----------------------- | -------------------------------------------------------------------------- |
| `src/lib/diff/blocked-lang-ids.json` | **Yes**                 | Language ids to **exclude** from the worker and production bundle          |
| `src/lib/diff/lang-ids.json`         | **No — auto-generated** | Language ids the diff worker loads at runtime                              |
| `src/lib/diff/lang-ids.ts`           | No                      | Typed re-export of `lang-ids.json` for app code                            |
| `src/modules/shiki-pruner.ts`        | No                      | Regenerates `lang-ids.json` and prunes unused Shiki chunks on `pnpm build` |

On every production build, `shiki-pruner` reads the blocklist, computes **all Shiki bundled languages minus blocked**, writes the result to `src/lib/diff/lang-ids.json`, and removes unneeded grammar chunks from the output zip.

**Do not edit `src/lib/diff/lang-ids.json` by hand** — changes will be overwritten on the next build.

Language ids are [Shiki language ids](https://shiki.style/languages) (e.g. `python`, `typescript`, `shell`, `dockerfile`).

### Add a language

1. Open `src/lib/diff/blocked-lang-ids.json`.
2. **Remove** the language id you want to support (keep the JSON array valid and sorted if you like).
3. Rebuild:

   ```bash
   pnpm build
   ```

4. Reload the unpacked extension.

The new language is included in `src/lib/diff/lang-ids.json`, loaded by the diff worker, and its grammar chunk is kept in the bundle.

### Remove a language

1. Open `src/lib/diff/blocked-lang-ids.json`.
2. **Add** the language id to the array.
3. Rebuild with `pnpm build` and reload the extension.

Removing a language shrinks the zip; keeping the blocklist lean helps stay under the Chrome Web Store size limit (2MB).

### Themes

Syntax **themes** are configured separately in `src/lib/diff/themes/ids.json`. The theme picker currently exposes **12 themes**:

`pierre-dark`, `pierre-light`, `github-dark`, `github-light`, `catppuccin-mocha`, `catppuccin-latte`, `dracula`, `one-dark-pro`, `nord`, `tokyo-night`, `everforest-dark`, `everforest-light`

To add or remove a theme, edit `src/lib/diff/themes/ids.json` and rebuild. Theme changes do not go through the language blocklist.

## Development scripts

| Script               | Description                          |
| -------------------- | ------------------------------------ |
| `pnpm dev`           | Watch mode - rebuild on file changes |
| `pnpm build`         | Production build for Chrome          |
| `pnpm build:firefox` | Production build for Firefox         |
| `pnpm compile`       | Type-check with `tsc --noEmit`       |
| `pnpm lint`          | Lint with Oxlint                     |
| `pnpm lint:fix`      | Lint and auto-fix                    |
| `pnpm fmt`           | Format with Oxfmt                    |
| `pnpm fmt:check`     | Check formatting                     |
