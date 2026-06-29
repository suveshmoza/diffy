<div align="center">
  <picture>
    <img src="https://iili.io/CCRv0XV.jpg" alt="diffy" width="96" height="96">
  </picture>

  <h1>diffy</h1>

<strong>A better way to review GitHub pull requests</strong>

<p>Full-screen diffs, searchable file tree, inline comments, batch reviews, viewed-file tracking, split/unified layout, 100+ languages, 50+ themes, and under 2 MB.</p>
</div>

**diffy** is a browser extension for reviewing GitHub pull requests in a full-screen, continuous view, with inline comments, batch reviews, and the tooling reviewers actually need. Powered by [Pierre Trees](https://trees.software) and [Pierre Diffs](https://diffs.com).

<https://github.com/user-attachments/assets/0a37798f-da98-46e1-a200-187290414452>

<h3 align="center">Install</h3>

<table align="center">
  <tr>
    <td align="center">
      <a href="https://chromewebstore.google.com/detail/diffy/oaakiockkfndnholpbeijclfbnldnpfn">
        <img src="https://developer.chrome.com/static/docs/webstore/branding/image/mPGKYBIR2uCP0ApchDXE.png" alt="Available in the Chrome Web Store" height="56">
      </a>
    </td>
    <td align="center">
      <a href="https://addons.mozilla.org/en-US/firefox/addon/diffy-pr/">
        <img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get the add-on for Firefox" height="56">
      </a>
    </td>
  </tr>
</table>

<p align="center">To build from source, see <a href="CONTRIBUTING.md">CONTRIBUTING.md</a>.</p>

> Inspired by [Linear View Diff](https://github.com/CarterMcAlister/linear-code-review) by [Carter McAlister](https://github.com/CarterMcAlister), a Chrome extension that adds a **View Diff** button on Linear review pages and renders linked GitHub PRs with Pierre Trees and Pierre Diffs.

## Features

### Viewing

- **One-click access**: a **View Diff** button on every GitHub pull request; starts prefetching PR data as soon as the page loads
- **Full-screen diffs**: scroll through the entire PR in one continuous view
- **Fast and smooth**: a responsive full-screen review experience
- **Under 2 MB**: lightweight install despite 100+ languages, 50+ themes, and full PR rendering
- **File tree with search**: jump to any changed file, even in huge PRs; comment badges mark files with threads
- **Collapse files**: expand or collapse individual files; viewed files auto-collapse
- **PR sidebar**: file/line/comment stats, branches, author, state, labels, and reviewers at a glance
- **Split or unified layout**: switch between side-by-side and stacked views
- **Display settings**: diff indicators (classic/bars/none), hunk separators, line numbers, wrap vs horizontal scroll
- **Syntax highlighting**: 100+ languages with clear, colorized diffs and sticky file headers
- **50+ themes**: Auto/Light/Dark mode with separate light and dark theme picks (Pierre, GitHub, Catppuccin, Dracula, Nord, Tokyo Night, and more)
- **Open in new tab**: detach the overlay into a standalone browser tab
- **Refresh**: reload the latest PR data after new commits land

### Review

- **Review comments inline**: read existing threads right in the diff, with hover highlighting and reply support
- **Comment from the diff**: select lines and post inline comments without leaving the viewer
- **Batch review**: collect multiple comments into one review, then publish with a single **Comment**, **Approve**, or **Request changes** verdict
- **Viewed-file tracking**: mark files as viewed, track progress (`3/12 viewed`), and jump to the next unviewed file
- **Private repo support**: add a GitHub token in the extension popup when needed

## Why diffy?

GitHub's **Files changed** tab works well for most pull requests. It starts to break down on PRs with large code changes (hundreds of files, big diffs, or heavy review threads), where you hit documented diff limits and long-standing UX friction.

| The GitHub problem                                                                                                                              | How diffy helps                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **"Diff too large to display"**: GitHub caps total PR diffs at 20,000 lines / 1 MB and refuses to render beyond that                            | Fetches changes through the GitHub API and renders them in a dedicated viewer, bypassing the web UI diff renderer |
| **300+ changed files**: the unified diff endpoint returns a 406 error; GitHub tells you to use the files API instead                            | Uses the paginated files API to load every changed file, then assembles the full diff                             |
| **"Load diff" on every large file**: GitHub only auto-loads the first 400 lines / 20 KB per file; you click to load the rest one file at a time | Shows full file patches in one continuous scroll, with no per-file load buttons                                   |
| **File-by-file review**: expand, collapse, and jump between files; easy to lose context across a big PR                                         | One continuous full-PR view with a searchable file tree to jump anywhere instantly                                |
| **Slow, freezing Files changed tab**: reviewers report UI lag, high memory use, and multi-second freezes even on medium PRs                     | A lightweight overlay with fast rendering that stays responsive where GitHub's tab struggles                      |
| **Comments scattered across tabs**: unresolved threads are hard to track in Conversation vs Files changed                                       | Inline review comment threads rendered directly on the lines you're reading                                       |

## How it works

1. Open any pull request on GitHub. diffy adds a **View Diff** button and starts prefetching PR data as the page loads.
2. Click **View Diff** to open a full-screen diff viewer with every changed file in one scrollable view.
3. Use the file tree on the left to search and jump between files.
4. Read and leave review comments directly on the lines you're looking at.
5. Start a batch review to queue comments, mark files as viewed, and publish your verdict when you're done.

## GitHub token

The extension popup lets you save an optional personal access token. A token is required for:

- **Private repositories**
- **Higher API rate limits**
- **Posting review comments**
- **Viewed-file tracking and batch reviews**

After saving a token, reload any open PR tabs for it to take effect.

### Token type

| Capability                     | Fine-grained PAT | Classic PAT (`ghp_…`) or `gh auth token` (`gho_…`) |
| ------------------------------ | ---------------- | -------------------------------------------------- |
| View diffs (public/private)    | ✅               | ✅                                                 |
| Read inline comments           | ✅               | ✅                                                 |
| Post inline comments           | ✅               | ✅                                                 |
| Mark files as viewed           | ❌               | ✅                                                 |
| Batch review / publish verdict | ❌               | ✅                                                 |

Fine-grained tokens (`github_pat_…`) work for diffs and comments, but GitHub's GraphQL mutations for the review flow (viewed files, publish review) require a **classic PAT with `repo` scope** or a token from `gh auth login`. The popup warns when your token won't support the full review flow.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR or issue.
