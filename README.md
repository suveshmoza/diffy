<div align="center">
  <picture>
    <img src="https://iili.io/CCRv0XV.jpg" alt="diffy" width="96" height="96">
  </picture>

  <h1>diffy</h1>

<strong>Fast PR reviews on GitHub, even for large PRs</strong>

<p>See the whole PR in one scrollable view. Jump to any file, comment inline, and publish your review when you're ready.</p>
</div>

Powered by Pierre [Trees](https://trees.software) and [Diffs](https://diffs.com).

<https://github.com/user-attachments/assets/a3682856-963a-4261-b77a-ad5038d9ef7e>

<h3 align="center">Install</h3>

<table align="center">
  <tr>
    <td align="center">
      <a href="https://chromewebstore.google.com/detail/diffy/oaakiockkfndnholpbeijclfbnldnpfn">
        <img src="https://i.ibb.co/xKcKpPqC/m-PGKYBIR2u-CP0-Apch-DXE.png" alt="Available in the Chrome Web Store" height="56">
      </a>
    </td>
    <td align="center">
      <a href="https://addons.mozilla.org/en-US/firefox/addon/diffy-pr/">
        <img src="https://i.ibb.co/tTGNC9cG/get-the-addon.webp" alt="Get the add-on for Firefox" height="56">
      </a>
    </td>
  </tr>
</table>

## Features

- **Full-screen diffs** : Scroll the entire PR in without any slowdown.
- **Searchable file tree** : Jump to any file instantly, even in huge PRs.
- **Inline comments & batch reviews** : Comment on lines, queue threads, and publish from the review dock
- **Viewed-file tracking** : Mark what you've read and jump to the next unviewed file
- **Split or unified layout** : Choose between a split view or a unified view.

Many more: Themes, Customizable fonts, Image diffs, customizable , open in separate tab, and more.

## Why diffy?

GitHub’s Files changed works well for small PRs but struggles with large ones. diffy solves this by providing a dedicated, responsive diff viewer that handles large PRs with hundreds of files and heavy review threads.

## GitHub token

Save an optional personal access token in the extension popup.

**Required for:**

- Private repos
- Higher API rate limits
- Post review comments
- Viewed-file tracking and batch reviews

Reload open PR tabs after saving a token.

## Token type

| Capability | Fine-grained PAT | Classic PAT (`ghp_…`) or `gh auth token` (`gho_…`) |
| --- | --- | --- |
| View diffs (public/private) | ✅ | ✅ |
| Read inline comments | ✅ | ✅ |
| Post inline comments | ✅ | ✅ |
| Mark files as viewed | ❌ | ✅ |
| Batch review / publish verdict | ❌ | ✅ |

Fine-grained tokens (`github_pat_…`) work for diffs and comments. GraphQL mutations for viewed files and publishing reviews need a **classic PAT with `repo` scope** or a token from `gh auth login`.

## Quick start

1. Open a PR on GitHub → **View Diff** (or right-click a PR link → **Open in diffy**).
2. Scroll the full diff, use the file tree to jump around.
3. Leave comments on lines, start a batch review to queue and publish when done.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).
