<div align="center">
  <picture>
    <img src="https://iili.io/CCRv0XV.jpg" alt="diffy" width="96" height="96">
  </picture>

  <h1>diffy</h1>

<strong>Browser extension for reviewing large PRs on GitHub</strong>

<p>Open a PR in one scrollable view. Jump to any file, comment inline, and publish your review when you're ready.</p>
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

- **Full-screen diffs** — scroll the whole PR in one view
- **Searchable file tree** — jump to any file; resize the sidebar and keep the width
- **Inline comments & batch reviews** — queue comments and publish from the review dock
- **Viewed-file tracking** — mark files as read and see review progress
- **Split or unified layout** — plus themes, custom fonts, image diffs, and open-in-tab

## Quick start

1. Open a PR on GitHub → **View Diff** (or right-click a PR link → **Open in diffy**).
2. Scroll the diff and use the file tree to jump around.
3. Comment on lines, then publish from the review dock when ready.

## GitHub token

A token is optional for public repos. Save a personal access token in the extension popup, then reload open PR tabs.

Use a token for:

- Private repos
- Higher API rate limits
- Posting review comments
- Viewed-file tracking and batch reviews

| Capability                     | Fine-grained PAT | Classic PAT (`ghp_…`) or `gh auth token` (`gho_…`) |
| ------------------------------ | ---------------- | -------------------------------------------------- |
| View diffs (public/private)    | ✅               | ✅                                                 |
| Read inline comments           | ✅               | ✅                                                 |
| Post inline comments           | ✅               | ✅                                                 |
| Mark files as viewed           | ❌               | ✅                                                 |
| Batch review / publish verdict | ❌               | ✅                                                 |

Fine-grained tokens (`github_pat_…`) work for diffs and comments. Viewed files and publishing reviews need a **classic PAT with `repo` scope**, or a token from `gh auth login`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
