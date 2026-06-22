# Changelog

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
