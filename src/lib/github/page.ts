import { parseCurrentPullRequestUrl, parseGitHubPullRequestUrl } from './api';

const BUTTON_ID = 'github-pr-viewer-button';
const BUTTON_HOST_ID = 'github-pr-viewer-button-host';
const ROOT_ID = 'github-pr-viewer-root';
const ROOT_HIDDEN_CLASS = 'gprv-root-hidden';

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

const VIEW_DIFF_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true" focusable="false" class="gprv-view-diff-icon"><path fill="currentColor" d="M40.1 467.1l-11.2 9C25.7 478.6 21.8 480 17.8 480 8 480 0 472 0 462.2L0 192C0 86 86 0 192 0S384 86 384 192l0 270.2c0 9.8-8 17.8-17.8 17.8-4 0-7.9-1.4-11.1-3.9l-11.2-9c-13.4-10.7-32.8-9-44.1 3.9L269.3 506c-3.3 3.8-8.2 6-13.3 6s-9.9-2.2-13.3-6l-26.6-30.5c-12.7-14.6-35.4-14.6-48.2 0L141.3 506c-3.3 3.8-8.2 6-13.3 6s-9.9-2.2-13.3-6L84.2 471c-11.3-12.9-30.7-14.6-44.1-3.9zM160 192a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm96 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>`;

type ViewDiffButtonCallbacks = {
  onOpen: (pullRequestUrl: string) => void;
  onPrefetch: (pullRequestUrl: string) => void;
};

let buttonCallbacks: ViewDiffButtonCallbacks | null = null;
let syncScheduled = false;
let headerObserver: MutationObserver | null = null;
let observedHeaderRoot: HTMLElement | null = null;

export function installViewDiffButton(
  onOpen: (pullRequestUrl: string) => void,
  onPrefetch: (pullRequestUrl: string) => void,
): void {
  if (!isPullRequestPage(location.href)) {
    return;
  }

  buttonCallbacks = { onOpen, onPrefetch };
  syncViewDiffButton(onOpen, onPrefetch);
  ensureHeaderObserver();
}

export function uninstallViewDiffButton(): void {
  disconnectHeaderObserver();
  removeViewDiffButton();
  buttonCallbacks = null;
  syncScheduled = false;
}

function ensureHeaderObserver(): void {
  const headerRoot = findPrHeaderRoot();
  if (!headerRoot || headerRoot === observedHeaderRoot) {
    return;
  }

  disconnectHeaderObserver();
  observedHeaderRoot = headerRoot;
  headerObserver = new MutationObserver(() => {
    scheduleSyncViewDiffButton();
  });
  headerObserver.observe(headerRoot, { childList: true, subtree: true });
}

function disconnectHeaderObserver(): void {
  headerObserver?.disconnect();
  headerObserver = null;
  observedHeaderRoot = null;
}

function findPrHeaderRoot(): HTMLElement | null {
  for (const selector of PR_HEADER_SELECTORS) {
    const match = document.querySelector<HTMLElement>(selector);
    if (match) {
      return match;
    }
  }

  return null;
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

    if (!isPullRequestPage(location.href)) {
      uninstallViewDiffButton();
      return;
    }

    ensureHeaderObserver();
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
    existing.classList.remove(ROOT_HIDDEN_CLASS);
    return existing;
  }

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('data-github-pr-viewer-root', '');
  document.body.append(root);
  return root;
}

export function hideOverlayRoot(): void {
  const root = document.getElementById(ROOT_ID);
  if (root) {
    root.classList.add(ROOT_HIDDEN_CLASS);
  }
}

export function removeOverlayRoot(): void {
  document.getElementById(ROOT_ID)?.remove();
}

function injectButton(
  onOpen: (pullRequestUrl: string) => void,
  onPrefetch: (pullRequestUrl: string) => void,
): void {
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
  const button = createButton(anchorControl, ref.url, onOpen, onPrefetch);

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
  const roots = PR_HEADER_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector)),
  );
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

function findAnchorControl(
  headerRoots: HTMLElement[],
): HTMLAnchorElement | HTMLButtonElement | null {
  for (const selector of FILES_TAB_SELECTORS) {
    const element = queryInRoots<HTMLAnchorElement | HTMLButtonElement>(headerRoots, selector);
    if (element) {
      return element;
    }
  }

  for (const root of headerRoots) {
    const controls = Array.from(
      root.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('a, button'),
    );
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
  onPrefetch: (pullRequestUrl: string) => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.className = `${anchorControl?.className || 'btn gprv-inline-button'} gprv-view-diff-button`;
  button.setAttribute('aria-label', 'View Diff');
  button.innerHTML = `${VIEW_DIFF_ICON_SVG}<span class="gprv-view-diff-label">View Diff</span>`;

  if (anchorControl instanceof HTMLElement) {
    const style = anchorControl.getAttribute('style');
    if (style) {
      button.setAttribute('style', style);
    }
  }

  button.addEventListener('mouseenter', () => {
    onPrefetch(pullRequestUrl);
  });

  button.addEventListener('focusin', () => {
    onPrefetch(pullRequestUrl);
  });

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
