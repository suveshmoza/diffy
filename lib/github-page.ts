import { parseCurrentPullRequestUrl, parseGitHubPullRequestUrl } from './github';

const BUTTON_ID = 'github-pr-viewer-button';
const BUTTON_HOST_ID = 'github-pr-viewer-button-host';
const ROOT_ID = 'github-pr-viewer-root';

const PR_HEADER_SELECTORS = [
  '[data-testid="pull-request-header"]',
  '.gh-header',
  '.PageHeader',
  'react-app[app-name="react-app"]',
] as const;

const FILES_TAB_SELECTORS = [
  'a#prs-files-anchor-tab',
  'a[href*="/pull/"][href$="/changes"]',
  'a[href*="/pull/"][href$="/files"]',
  'a[data-tab-item="files-changed-tab"]',
  'button[data-hotkey="g p"]',
] as const;

const HEADER_ACTIONS_SELECTORS = [
  '[data-testid="pull-request-header-actions"]',
  '.gh-header-actions',
  '.PageHeader-actions',
] as const;

type ViewDiffButtonCallbacks = {
  onOpen: (pullRequestUrl: string) => void;
  onPrefetch: (pullRequestUrl: string) => void;
};

let buttonInstaller: { disconnect: () => void } | null = null;
let buttonCallbacks: ViewDiffButtonCallbacks | null = null;
let syncScheduled = false;

export function installViewDiffButton(
  onOpen: (pullRequestUrl: string) => void,
  onPrefetch: (pullRequestUrl: string) => void,
): { disconnect: () => void } {
  if (buttonInstaller) {
    return buttonInstaller;
  }

  buttonCallbacks = { onOpen, onPrefetch };
  const observer = new MutationObserver(() => {
    scheduleSyncViewDiffButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const disconnect = () => {
    observer.disconnect();
    removeViewDiffButton();
    buttonInstaller = null;
    buttonCallbacks = null;
    syncScheduled = false;
  };

  buttonInstaller = { disconnect };
  syncViewDiffButton(onOpen, onPrefetch);
  return buttonInstaller;
}

function scheduleSyncViewDiffButton(): void {
  if (syncScheduled || !buttonCallbacks) {
    return;
  }

  syncScheduled = true;
  requestAnimationFrame(() => {
    syncScheduled = false;
    if (!buttonCallbacks) {
      return;
    }

    syncViewDiffButton(buttonCallbacks.onOpen, buttonCallbacks.onPrefetch);
  });
}

export function syncViewDiffButton(
  onOpen: (pullRequestUrl: string) => void,
  onPrefetch: (pullRequestUrl: string) => void,
): void {
  if (!isPullRequestPage(location.href)) {
    removeViewDiffButton();
    return;
  }

  injectButton(onOpen, onPrefetch);
}

export function removeViewDiffButton(): void {
  document.getElementById(BUTTON_HOST_ID)?.remove();
  document.getElementById(BUTTON_ID)?.remove();
}

export function getOrCreateOverlayRoot(): HTMLElement {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    return existing;
  }

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('data-github-pr-viewer-root', '');
  document.body.append(root);
  return root;
}

export function removeOverlayRoot(): void {
  document.getElementById(ROOT_ID)?.remove();
}

function injectButton(onOpen: (pullRequestUrl: string) => void, onPrefetch: (pullRequestUrl: string) => void): void {
  const ref = parseCurrentPullRequestUrl();
  if (!ref) {
    return;
  }

  onPrefetch(ref.url);

  const existing = getMountedButton();
  if (existing) {
    return;
  }

  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(BUTTON_HOST_ID)?.remove();

  const headerRoots = getPrHeaderRoots();
  const anchorControl = findAnchorControl(headerRoots);
  const button = createButton(anchorControl, ref.url, onOpen);

  if (anchorControl && insertButtonNearControl(button, anchorControl)) {
    return;
  }

  for (const selector of HEADER_ACTIONS_SELECTORS) {
    const actions = queryInRoots<HTMLElement>(headerRoots, selector);
    if (actions) {
      actions.prepend(button);
      return;
    }
  }

  const titleHeader = queryInRoots<HTMLElement>(
    headerRoots,
    '.gh-header-title, [data-testid="pull-request-header"] .markdown-title, h1',
  );
  if (titleHeader) {
    titleHeader.append(button);
    return;
  }

  mountFloatingButtonHost(button);
}

function getMountedButton(): HTMLButtonElement | null {
  const button = document.getElementById(BUTTON_ID);
  return button instanceof HTMLButtonElement && button.isConnected ? button : null;
}

function getPrHeaderRoots(): HTMLElement[] {
  const roots = PR_HEADER_SELECTORS.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)));
  return roots.length > 0 ? roots : [document.body];
}

function queryInRoots<T extends Element>(roots: HTMLElement[], selector: string): T | null {
  for (const root of roots) {
    const match = root.querySelector<T>(selector);
    if (match) {
      return match;
    }
  }

  return document.querySelector<T>(selector);
}

function findAnchorControl(headerRoots: HTMLElement[]): HTMLAnchorElement | HTMLButtonElement | null {
  for (const selector of FILES_TAB_SELECTORS) {
    const element = queryInRoots<HTMLAnchorElement | HTMLButtonElement>(headerRoots, selector);
    if (element) {
      return element;
    }
  }

  for (const root of headerRoots) {
    const controls = Array.from(root.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('a, button'));
    const filesTab = controls.find((control) => isFilesChangedControl(control));
    if (filesTab) {
      return filesTab;
    }
  }

  return null;
}

function isFilesChangedControl(control: HTMLAnchorElement | HTMLButtonElement): boolean {
  const label = control.textContent?.trim().toLowerCase() ?? '';
  if (!label.includes('files')) {
    return false;
  }

  if (control instanceof HTMLAnchorElement) {
    return /\/pull\/\d+(?:\/files|\/changes)?\/?$/i.test(control.pathname);
  }

  return label.includes('changed') || label.includes('files');
}

function insertButtonNearControl(button: HTMLButtonElement, control: HTMLElement): boolean {
  const parent = control.parentElement;
  if (!parent) {
    return false;
  }

  parent.insertBefore(button, control.nextSibling);
  return true;
}

function mountFloatingButtonHost(button: HTMLButtonElement): void {
  const host = document.createElement('div');
  host.id = BUTTON_HOST_ID;
  host.className = 'gprv-view-diff-host';
  host.append(button);
  document.body.append(host);
}

function createButton(
  anchorControl: HTMLAnchorElement | HTMLButtonElement | null,
  pullRequestUrl: string,
  onOpen: (pullRequestUrl: string) => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.className = anchorControl?.className || 'btn gprv-inline-button';
  button.textContent = 'View Diff';

  if (anchorControl instanceof HTMLElement) {
    const style = anchorControl.getAttribute('style');
    if (style) {
      button.setAttribute('style', style);
    }
  }

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen(pullRequestUrl);
  });

  return button;
}

export function isPullRequestPage(url: string): boolean {
  return parseGitHubPullRequestUrl(url) != null;
}
