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

When developing with `pnpm dev`, load the extension from `.output/chrome-mv3-dev`. Production builds output to `.output/chrome-mv3`.

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
   - `pnpm dev` → `.output/chrome-mv3-dev`
   - `pnpm build` → `.output/chrome-mv3`

## Load in Firefox

1. Build for Firefox:

   ```bash
   pnpm build:firefox
   ```

2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**.
4. Select any file inside `.output/firefox-mv2` (for example `manifest.json`).

To remove the extension, use **Remove** on the extension card (Chrome) or reload the temporary add-on page (Firefox).

## Project structure

```text
diffy/
├── src/
│   ├── components/      # React UI (app, diff, review, theming)
│   ├── entrypoints/     # background, github-pr.content, overlay, popup
│   ├── hooks/
│   ├── lib/             # code-view, diff, file-tree, github, overlay, query, review, theming
│   ├── modules/         # shiki-pruner (lang allowlist + bundle pruning)
│   ├── providers/
│   ├── reducers/
│   └── types/
├── patches/             # pnpm patchedDependencies (@pierre/trees)
└── wxt.config.ts
```

## Syntax highlighting languages

Syntax highlighting is powered by [Shiki](https://shiki.style/) via Pierre Diffs. To keep the extension size small, we do not ship every Shiki grammar. The extension currently includes **106 Shiki grammars** (100+ languages, including common aliases like `js`/`javascript` and `py`/`python`). Which languages are included is controlled by a **blocklist**: every Shiki bundled language is enabled except those listed in the blocklist.

### Files

| File                                 | Editable?               | Role                                                                |
| ------------------------------------ | ----------------------- | ------------------------------------------------------------------- |
| `src/lib/diff/blocked-lang-ids.json` | **Yes**                 | Language ids to **exclude** from the worker and production bundle   |
| `src/lib/diff/lang-ids.json`         | **No (auto-generated)** | Language ids the diff worker loads at runtime                       |
| `src/lib/diff/lang-ids.ts`           | No                      | Typed re-export of `lang-ids.json` for app code                     |
| `src/modules/shiki-pruner.ts`        | No                      | Regenerates `lang-ids.json` and prunes unused Shiki chunks on build |

On every build (including `pnpm dev`), `shiki-pruner` reads the blocklist, computes **all Shiki bundled languages minus blocked**, and writes the result to `src/lib/diff/lang-ids.json`. On production builds only, it also removes unneeded grammar chunks from the output zip.

**Do not edit `src/lib/diff/lang-ids.json` by hand.** Changes will be overwritten on the next build.

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

Removing a language shrinks the zip and helps reduce the size of the extension.
