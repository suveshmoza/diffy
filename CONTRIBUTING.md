# Contributing

Thanks for your interest in diffy!

When contributing:

1. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (e.g. `feat: add refresh button`, `fix: expand file when unmarking as viewed`).
2. Keep PR descriptions clear and concise.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/)

## Development

```bash
git clone git@github.com:suveshmoza/diffy.git
cd diffy
pnpm install
pnpm dev
```

`pnpm dev` watches for changes and rebuilds the extension. Reload the unpacked extension in your browser after each rebuild.

When developing with `pnpm dev`, load the extension from `dist/chrome-mv3-dev`. Production builds output to `dist/chrome-mv3`.

## Build

```bash
pnpm build              # Chrome
pnpm build:firefox      # Firefox
pnpm build:edge         # Edge
pnpm build:safari       # Safari
pnpm zip                # Packaged Chrome zip
pnpm zip:firefox        # Packaged Firefox zip
pnpm zip:edge           # Packaged Edge zip
```

## Load in Chrome

1. Build the extension (or keep `pnpm dev` running):

   ```bash
   pnpm build   # or: pnpm dev
   ```

2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the build output folder:
   - `pnpm dev` → `dist/chrome-mv3-dev`
   - `pnpm build` → `dist/chrome-mv3`

## Load in Firefox

1. Build for Firefox:

   ```bash
   pnpm build:firefox
   ```

2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**.
4. Select any file inside `dist/firefox-mv3` (for example `manifest.json`).

To remove the extension, use **Remove** on the extension card (Chrome) or reload the temporary add-on page (Firefox).

## Project structure

```text
diffy/
├── src/
│   ├── app/             # Overlay React composition root
│   ├── domains/         # Feature slices (code-view, diff, github, review, theming, …)
│   ├── entrypoints/     # background, github-pr.content, overlay, popup
│   ├── modules/         # WXT modules (shiki-pruner)
│   ├── shared/          # Shared UI and utilities
│   └── types/
├── patches/             # pnpm patchedDependencies (@pierre/trees)
└── wxt.config.ts
```

## Syntax highlighting languages

Syntax highlighting is powered by [Pierre Diffs](https://diffs.com/docs), which selects one highlighter backend at runtime:

- **[Highlights](https://diffs.com/docs#highlights)** when WebAssembly SIMD is available (the usual case)
- **[Shiki](https://shiki.style/) JS** (`shiki-js`) as a fallback when WASM is unavailable or blocked

Only one backend is active per page. To keep the extension size small, we do not ship every Shiki grammar or theme. Languages and themes are controlled by hand-maintained **allowlists** (preload + pruning unused chunks from production builds).

### Files

| File                                          | Editable? | Role                                                                   |
| --------------------------------------------- | --------- | ---------------------------------------------------------------------- |
| `src/domains/diff/highlighting/lang-ids.json` | **Yes**   | Allowlist of canonical language ids to load and keep in the zip        |
| `src/domains/diff/highlighting/lang-ids.ts`   | No        | Typed re-export of `lang-ids.json` for app / worker preload code       |
| `src/domains/theming/model/theme-ids.json`    | **Yes**   | Allowlist of theme names offered in the UI and kept in the zip         |
| `src/domains/theming/model/theme-ids.ts`      | No        | Typed re-export of `theme-ids.json` for catalog / preload code         |
| `src/modules/shiki-pruner.ts`                 | No        | On `pnpm build`, deletes Shiki lang/theme chunks not in the allowlists |

### Languages

Use [Shiki **canonical** language ids](https://shiki.style/languages) (the **ID** column, not Alias) — e.g. `python`, `typescript`, `shellscript`, `docker`. Aliases like `ts` / `py` / `sh` still work at highlight time; do not list them in `lang-ids.json`.

**Add / remove:** edit `src/domains/diff/highlighting/lang-ids.json`, then `pnpm build` and reload the extension.

### Themes

Theme names match Pierre / Shiki theme ids (e.g. `pierre-dark`, `pierre-light`). The default allowlist is the Pierre family only; adding a Shiki theme name (e.g. `catppuccin-mocha`) keeps its grammar chunk and makes it selectable in the UI.

**Add / remove:** edit `src/domains/theming/model/theme-ids.json`, then `pnpm build` and reload the extension. Persisted theme names that are no longer allowlisted fall back to `pierre-light` / `pierre-dark`.
