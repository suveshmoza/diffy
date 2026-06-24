const OVERLAY_PATH = '/overlay.html';

function isGitHubPullRequestUrl(url: string): boolean {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/i.test(url);
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.removeAll();
    browser.contextMenus.create({
      id: 'open-in-diffy-page',
      title: 'Open in diffy',
      contexts: ['page'],
      documentUrlPatterns: ['https://github.com/*/*/pull/*'],
    });

    browser.contextMenus.create({
      id: 'open-in-diffy-link',
      title: 'Open in diffy',
      contexts: ['link'],
      documentUrlPatterns: ['https://github.com/*'],
      targetUrlPatterns: ['https://github.com/*/*/pull/*'],
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    let targetUrl: string | undefined;

    if (info.menuItemId === 'open-in-diffy-link') {
      targetUrl = info.linkUrl;
    } else if (info.menuItemId === 'open-in-diffy-page') {
      targetUrl = tab?.url;
    }

    if (!targetUrl || !isGitHubPullRequestUrl(targetUrl)) {
      return;
    }

    const overlayUrl = browser.runtime.getURL(
      `${OVERLAY_PATH}?pr=${encodeURIComponent(targetUrl)}`,
    );
    browser.tabs.create({ url: overlayUrl, active: false });
  });
});
