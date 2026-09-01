# Changelog

## v1.4.1

### Fixes

- Stop Tailwind Preflight from leaking into GitHub pages by splitting content-script CSS from the overlay stylesheet
- Fix blank overlay on Firefox by authenticating iframe messages by origin instead of `event.source`
- Fix View Diff button not appearing on client-side navigation without a page refresh
- Soften scroll lock so GitHub layout is less disrupted while the overlay is open

## v1.4.0

### Features

- Add Review Dock: docked panel for queued comments, verdict, and publish; replaces the publish dialog (#28)
- Add markdown composer for review comments and summary (#28)
- Compact diff header; move review progress and status strip to the sidebar (#28)
- Replace font size and line-height presets with numeric inputs in display settings (#28)
- Show sidebar open/closed state on the sidebar toggle (#28)
- Drive overlay chrome colors from Pierre themes via shadcn semantic tokens (#28)

### Fixes

- Fix reply trigger visibility on comment threads (#28)

### Chores & Refactoring

- Migrate overlay UI to shadcn/Tailwind and Base UI (#28)
- Replace Tabler icons with `@pierre/icons` (#28)
- Add overlay portal context so popovers, selects, and dialogs render inside the diff overlay (#28)
- Rebuild display settings, header toolbar, sidebar, image diff, and notification UI on shadcn primitives (#28)
- Remove dead code from UI refactors (#28)
- Update dependencies; patch `@pierre/trees` to v1.0.0-beta.6
- Set `dist` as output directory
- Refresh README and extension description

## v1.3.0

### Features

- Add Expand All / Collapse All for diff files (#22)
- Swap repository and branch metadata in the overlay header
- Allow copying branch names from the overlay header
- Make the overlay header responsive on smaller screens (#25)
- Customize code and tree fonts in settings (#26)
- Preview image changes inline in PR diffs with before/after panes (#27)
- Add image lightbox compare modes (2-up, swipe, onion) with zoom, pan, and blink (#27)
- Prefetch and cache image blobs; show a placeholder for non-image binary files (#27)
- Add Images settings for default compare mode and checkerboard background (#27)

### Fixes

- Resolve oxlint `react-hooks/exhaustive-deps` warnings

### Chores & Refactoring

- Reorganize DiffOverlayHeader and DisplaySettings components (#24)

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
