# Changelog

## v1.2.0

### Features

- Add PR review flow with viewed files and batched reviews
- Add standalone tab and context menu support for opening PR diffs, including dynamic tab titles and background open
- Add PR stats and info panels to the sidebar
- Add collapse/expand chevron toggle to diff file headers
- Add refresh button to the diff overlay
- Set default hunk separator to `line-info`
- Integrate `@pierre/theming` as the theme layer (#16)
- Improve overlay header layout and fix popover opacity on Everforest themes (#14)

### Fixes

- Lock GitHub page scroll while Diffy overlay is open
- Render CodeView immediately when opening the overlay iframe
- Propagate upstream GitHub error details to the user
- Keep file tree search focus while filtering (#13)
- Pass `colorScheme` to FileTree host for icon theme switching

### Chores & Refactoring

- Migrate GitHub API client to Octokit (#17)
- Migrate overlay data fetching to TanStack Query
- Extract review logic from DiffOverlay into dedicated hooks
- Store GitHub token in `browser.storage.local`
- Extract query strings and add generated API types
- Warn about fine-grained PAT incompatibility with review flow (#18)
- Extract error strip bar into a separate component
- Update dependencies
- Add CONTRIBUTING.md and refresh README, demo video, and add-on link images

## v1.1.0

### Features

- Redesign the popup with better state handling and token validation (#12)
- Show PR author, state, draft status, date, and labels in overlay header
- Show file fetch progress while loading PR diff
- Add rate-limit warning, empty PR state, and inline error toast
- Add display settings to diff header with browser.storage.sync persistence (#10)
- Replace spinner with progress bar in LoadingOverlay
- Add rate-limit tracking to GitHub API module
- Add Open Sans font for consistent typography across overlay, popup, and web components

### Fixes

- Register .mts/.cts custom extensions for syntax highlighting
- Use portable worker via wxt publicAssets for same-origin dev support
- Prevent indefinite hang on theme resolution failure

### Chores & Refactoring

- Reorganize src/lib into domain-based subdirectories
- Extract context providers, group components by domain
- Remove dead code and unused CSS
- Update dependencies
- Add Edge and Safari build scripts
- Update extension description and simplify autoIcons config
- Rename Markdown import to MarkdownToJsx
- Revert back to 128px logo img
- Fix pnpm-workspace.yaml placeholder values
