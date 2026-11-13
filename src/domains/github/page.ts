import {
  getPullRequestRefPrefix,
  parseCurrentPullRequestUrl,
  parseGitHubPullRequestUrl,
} from './api';

const BUTTON_ID = 'github-pr-viewer-button';
const BUTTON_HOST_ID = 'github-pr-viewer-button-host';
const ROOT_ID = 'github-pr-viewer-root';
const ROOT_HIDDEN_CLASS = 'gprv-root-hidden';

/** Never copy UnderlineNav tab classes — appearance comes from content.css. */
const VIEW_DIFF_BUTTON_CLASS = 'gprv-view-diff-button';

const PR_HEADER_SELECTORS = [
  '[data-testid="pull-request-header"]',
  '.gh-header',
  '.PageHeader',
  '[class*="prc-PageHeader-PageHeader"]',
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
  '[class*="PageHeader-Actions"]',
  '[class*="PageHeader-actions"]',
] as const;

const VIEW_DIFF_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" aria-hidden="true" focusable="false" class="gprv-view-diff-icon"><path fill="currentColor" d="M40.1 467.1l-11.2 9C25.7 478.6 21.8 480 17.8 480 8 480 0 472 0 462.2L0 192C0 86 86 0 192 0S384 86 384 192l0 270.2c0 9.8-8 17.8-17.8 17.8-4 0-7.9-1.4-11.1-3.9l-11.2-9c-13.4-10.7-32.8-9-44.1 3.9L269.3 506c-3.3 3.8-8.2 6-13.3 6s-9.9-2.2-13.3-6l-26.6-30.5c-12.7-14.6-35.4-14.6-48.2 0L141.3 506c-3.3 3.8-8.2 6-13.3 6s-9.9-2.2-13.3-6L84.2 471c-11.3-12.9-30.7-14.6-44.1-3.9zM160 192a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm96 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>`;

type ViewDiffButtonCallbacks = {
  onOpen: (pullRequestUrl: string) => void;
  onPrefetch: (pullRequestUrl: string) => void;
};

/** How long to keep looking for a real header anchor before settling for a floating button. */
const ANCHOR_RETRY_WINDOW_MS = 15_000;
const RETRY_INTERVAL_MS = 250;
const SYNC_DEBOUNCE_MS = 100;

let buttonCallbacks: ViewDiffButtonCallbacks | null = null;
let documentObserver: MutationObserver | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;
let retryDeadline = 0;
let floatingFallbackAllowed = false;
let prefetchedPullRequestKey: string | null = null;

/**
 * Starts watching for pull request pages. Safe to call on any github.com page: the
 * watcher stays alive across client-side navigation and mounts or removes the button
 * as the URL changes.
 */
export function installViewDiffButton(
  onOpen: (pullRequestUrl: string) => void,
  onPrefetch: (pullRequestUrl: string) => void,
): void {
  buttonCallbacks = { onOpen, onPrefetch };
  ensureDocumentObserver();
  startAnchorRetry();
  syncViewDiffButton(onOpen, onPrefetch);
}

export function uninstallViewDiffButton(): void {
  stopAnchorRetry();
  disconnectDocumentObserver();

  if (syncTimer != null) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  removeViewDiffButton();
  buttonCallbacks = null;
  prefetchedPullRequestKey = null;
}

/**
 * GitHub replaces the PR header wholesale on client-side navigation, so an observer
 * bound to the header stops firing the moment that header is swapped out. Watching the
 * document keeps working across navigations and re-renders.
 */
function ensureDocumentObserver(): void {
  if (documentObserver) {
    return;
  }

  documentObserver = new MutationObserver(() => {
    scheduleSyncViewDiffButton();
  });
  documentObserver.observe(document.documentElement, { childList: true, subtree: true });
}

function disconnectDocumentObserver(): void {
  documentObserver?.disconnect();
  documentObserver = null;
}

/** Catches header renders that produce no mutation we can see, and background tabs. */
function startAnchorRetry(): void {
  floatingFallbackAllowed = false;
  retryDeadline = Date.now() + ANCHOR_RETRY_WINDOW_MS;

  if (retryTimer != null) {
    return;
  }

  retryTimer = setInterval(() => {
    if (!buttonCallbacks) {
      stopAnchorRetry();
      return;
    }

    if (Date.now() > retryDeadline) {
      floatingFallbackAllowed = true;
      stopAnchorRetry();
    }

    syncViewDiffButton(buttonCallbacks.onOpen, buttonCallbacks.onPrefetch);
  }, RETRY_INTERVAL_MS);
}

function stopAnchorRetry(): void {
  if (retryTimer != null) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

function scheduleSyncViewDiffButton(): void {
  if (syncTimer != null || !buttonCallbacks) {
    return;
  }

  // A timeout rather than requestAnimationFrame, so the button also appears in
  // background tabs, where animation frames never run.
  syncTimer = setTimeout(() => {
    syncTimer = null;

    if (buttonCallbacks) {
      syncViewDiffButton(buttonCallbacks.onOpen, buttonCallbacks.onPrefetch);
    }
  }, SYNC_DEBOUNCE_MS);
}

function syncViewDiffButton(
  onOpen: (pullRequestUrl: string) => void,
  onPrefetch: (pullRequestUrl: string) => void,
): void {
  if (!isPullRequestPage(location.href)) {
    removeViewDiffButton();
    prefetchedPullRequestKey = null;
    return;
  }

  injectButton(onOpen, onPrefetch);
}

function removeViewDiffButton(): void {
  clearFilesAdjacentPin();
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

  const pullRequestKey = getPullRequestRefPrefix(ref);
  if (pullRequestKey !== prefetchedPullRequestKey) {
    prefetchedPullRequestKey = pullRequestKey;
    onPrefetch(ref.url);
    // A different PR means a new header is on its way in; give it time to render.
    startAnchorRetry();
  }

  const existing = getMountedButton();
  const isCurrentPullRequest = existing?.dataset.gprvPr === pullRequestKey;
  // Prefer staying next to Files changed once mounted there.
  if (
    existing &&
    isCurrentPullRequest &&
    existing.dataset.gprvPlacement === 'anchored' &&
    existing.dataset.gprvMount === 'files-adjacent'
  ) {
    return;
  }

  const headerRoots = getPrHeaderRoots();
  const filesTab = findFilesTabControl(headerRoots);
  const underlineNav = findPrUnderlineNav(filesTab);
  const actions = findHeaderActions(headerRoots, filesTab, underlineNav);

  // Nothing better than an already-mounted floating button yet.
  if (
    existing &&
    isCurrentPullRequest &&
    existing.dataset.gprvPlacement === 'floating' &&
    !filesTab &&
    !underlineNav &&
    !actions
  ) {
    return;
  }

  removeViewDiffButton();

  const button = createButton(pullRequestKey, onOpen, onPrefetch);

  // Primary: sit beside Files changed (new Overview + classic Conversation).
  // Use our own styles — never copy tab/UnderlineItem classes (#31).
  if (filesTab && insertButtonNearControl(button, filesTab)) {
    button.dataset.gprvPlacement = 'anchored';
    button.dataset.gprvMount = 'files-adjacent';
    return;
  }

  if (underlineNav && insertAfterUnderlineNav(button, underlineNav)) {
    button.dataset.gprvPlacement = 'anchored';
    button.dataset.gprvMount = 'after-nav';
    return;
  }

  if (actions) {
    mountInActions(button, actions);
    button.dataset.gprvPlacement = 'anchored';
    button.dataset.gprvMount = 'header-actions';
    return;
  }

  const titleHeader = queryInRoots<HTMLElement>(
    headerRoots,
    '.gh-header-title, [data-testid="pull-request-header"] .markdown-title, h1',
  );
  if (titleHeader) {
    const host = document.createElement('div');
    host.id = BUTTON_HOST_ID;
    host.className = 'gprv-view-diff-inline-host';
    host.append(button);
    titleHeader.append(host);
    button.dataset.gprvPlacement = 'anchored';
    button.dataset.gprvMount = 'title';
    return;
  }

  // The header usually just has not rendered yet, so hold off on the floating
  // fallback until we have given it time to appear.
  if (!floatingFallbackAllowed) {
    return;
  }

  mountFloatingButtonHost(button);
  button.dataset.gprvPlacement = 'floating';
  button.dataset.gprvMount = 'floating';
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

function findFilesTabControl(
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

/**
 * New PR Overview puts Files/Commits/Checks in Primer UnderlineNav. Inserting into
 * that strip counts as another tab and overflows into "More items" (#31).
 */
function isInsidePrTabStrip(element: Element): boolean {
  return findPrUnderlineNav(element) != null;
}

function findPrUnderlineNav(from: Element | null | undefined): HTMLElement | null {
  if (!from) {
    const filesTab = document.querySelector('#prs-files-anchor-tab');
    if (filesTab) {
      return findPrUnderlineNav(filesTab);
    }
    return null;
  }

  const nav = from.closest('nav');
  if (!(nav instanceof HTMLElement)) {
    return null;
  }

  const className = typeof nav.className === 'string' ? nav.className : '';
  if (
    className.includes('UnderlineNav') ||
    className.includes('UnderlineWrapper') ||
    nav.querySelector('#prs-files-anchor-tab, #prs-commits-anchor-tab') != null
  ) {
    return nav;
  }

  return null;
}

function findHeaderActions(
  headerRoots: HTMLElement[],
  filesTab: Element | null,
  underlineNav: HTMLElement | null,
): HTMLElement | null {
  for (const selector of HEADER_ACTIONS_SELECTORS) {
    const actions = queryInRoots<HTMLElement>(headerRoots, selector);
    if (actions && !isInsidePrTabStrip(actions)) {
      return actions;
    }
  }

  // New Overview sticky slot (Submit review / Copilot), outside PageHeader.
  const submitReview = findSubmitReviewButton();
  const actionsFromSubmit = submitReview?.closest<HTMLElement>('[class*="actions__"]');
  if (
    actionsFromSubmit &&
    isLikelyHeaderActions(actionsFromSubmit) &&
    !isInsidePrTabStrip(actionsFromSubmit)
  ) {
    return actionsFromSubmit;
  }

  const searchRoots: HTMLElement[] = [];
  const stickyHeader = document.querySelector<HTMLElement>(
    '[class*="StickyHeaderSlot"], [class*="stickyHeader"], [class*="miniHeaderInner"]',
  );
  if (stickyHeader) {
    searchRoots.push(stickyHeader);
  }

  const headerFromTab = filesTab?.closest<HTMLElement>(
    '[class*="prc-PageHeader-PageHeader"], .PageHeader, .gh-header, [data-testid="pull-request-header"]',
  );
  if (headerFromTab) {
    searchRoots.push(headerFromTab);
  }
  if (underlineNav?.parentElement) {
    searchRoots.push(underlineNav.parentElement);
  }
  for (const root of headerRoots) {
    if (root !== document.body) {
      searchRoots.push(root);
    }
  }

  for (const root of searchRoots) {
    const pageHeaderActions = root.querySelector<HTMLElement>(
      '[class*="prc-PageHeader-Actions"], [class*="PageHeader-Actions"]',
    );
    if (pageHeaderActions && !isInsidePrTabStrip(pageHeaderActions)) {
      return pageHeaderActions;
    }

    const byClass = root.querySelector<HTMLElement>('[class*="actions__"]');
    if (byClass && isLikelyHeaderActions(byClass) && !isInsidePrTabStrip(byClass)) {
      return byClass;
    }
  }

  return null;
}

function findSubmitReviewButton(): HTMLElement | null {
  const controls = Array.from(document.querySelectorAll<HTMLElement>('button, a'));
  return (
    controls.find((control) => {
      const className = typeof control.className === 'string' ? control.className : '';
      if (className.includes('ReviewMenuButton')) {
        return true;
      }

      // New Overview concatenates visible labels (e.g. "Submit reviewReview").
      const label = control.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      return /submit\s*review/i.test(label);
    }) ?? null
  );
}

function isLikelyHeaderActions(element: HTMLElement): boolean {
  const className = typeof element.className === 'string' ? element.className : '';
  if (!/(^|\s|__)actions(__|\s|$)|Actions|header-actions|PageHeader-actions/i.test(className)) {
    return false;
  }

  // Avoid huge page sections that merely contain the word "actions" in a class.
  if (element.querySelectorAll('button, a').length > 20) {
    return false;
  }

  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length > 400) {
    return false;
  }

  return (
    /submit\s*review|open comments|open copilot|reviewers|codeowners|edit title|unsubscribe|preview/i.test(
      text,
    ) ||
    (className.includes('actions__') && element.querySelector('button') != null)
  );
}

function insertAfterUnderlineNav(button: HTMLButtonElement, underlineNav: HTMLElement): boolean {
  // Prefer the PageHeader navigation row so the control sits beside the tab strip
  // without becoming an UnderlineNav item (which overflows into "More").
  const navigationRow = underlineNav.closest<HTMLElement>('[class*="prc-PageHeader-Navigation"]');
  const parent = navigationRow ?? underlineNav.parentElement;
  if (!parent) {
    return false;
  }

  const host = document.createElement('div');
  host.id = BUTTON_HOST_ID;
  host.className = 'gprv-view-diff-inline-host';
  host.append(button);

  if (navigationRow) {
    navigationRow.append(host);
  } else {
    parent.insertBefore(host, underlineNav.nextSibling);
  }
  return true;
}

function mountInActions(button: HTMLButtonElement, actions: HTMLElement): void {
  const host = document.createElement('div');
  host.id = BUTTON_HOST_ID;
  host.className = 'gprv-view-diff-inline-host';
  host.append(button);
  actions.prepend(host);
}

/** Keeps Overview View Diff glued to Files without participating in UnderlineNav overflow. */
let filesAdjacentPin: {
  observer: ResizeObserver;
  onWindowResize: () => void;
} | null = null;

function clearFilesAdjacentPin(): void {
  if (!filesAdjacentPin) {
    return;
  }
  filesAdjacentPin.observer.disconnect();
  window.removeEventListener('resize', filesAdjacentPin.onWindowResize);
  filesAdjacentPin = null;
}

/**
 * Overview UnderlineNav measures every `ul > li`. Any in-flow extra width (new
 * `<li>`, nested chrome, or flex sibling) pushes tabs into More (#31). Pin the
 * host with `position: absolute` beside Files so it takes no layout space.
 */
function pinHostBesideFiles(host: HTMLElement, filesControl: HTMLElement, nav: HTMLElement): void {
  clearFilesAdjacentPin();
  host.classList.add('gprv-view-diff-inline-host--pinned');

  const more = nav.querySelector<HTMLElement>('[class*="MoreButtonContainer"]');
  if (more) {
    nav.insertBefore(host, more);
  } else {
    nav.append(host);
  }

  const filesItem = filesControl.closest('li') ?? filesControl;

  const sync = (): void => {
    if (!host.isConnected || !nav.isConnected) {
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const filesRect = filesItem.getBoundingClientRect();
    const moreBox = more?.getBoundingClientRect();
    const hostWidth = host.offsetWidth || 96;
    const filesVisible =
      filesRect.width > 1 &&
      filesRect.height > 1 &&
      filesRect.bottom > navRect.top + 1 &&
      filesRect.top < navRect.bottom - 1;

    let left: number;
    let top: number;
    let height: number;

    if (filesVisible) {
      left = filesRect.right - navRect.left + 4;
      top = filesRect.top - navRect.top;
      height = filesRect.height;
    } else if (moreBox && moreBox.width > 1) {
      left = moreBox.left - navRect.left - hostWidth - 4;
      top = moreBox.top - navRect.top;
      height = moreBox.height;
    } else {
      left = Math.max(0, nav.clientWidth - hostWidth);
      top = 0;
      height = nav.clientHeight || 48;
    }

    if (moreBox && moreBox.width > 1) {
      left = Math.min(left, moreBox.left - navRect.left - hostWidth - 4);
    }
    left = Math.max(0, left);

    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
    host.style.height = `${height}px`;
  };

  const observer = new ResizeObserver(() => {
    sync();
  });
  observer.observe(nav);
  observer.observe(filesItem);
  const onWindowResize = (): void => {
    sync();
  };
  window.addEventListener('resize', onWindowResize);
  filesAdjacentPin = { observer, onWindowResize };

  requestAnimationFrame(() => {
    sync();
    requestAnimationFrame(sync);
  });
}

function insertButtonNearControl(button: HTMLButtonElement, control: HTMLElement): boolean {
  // Own host/styles only — never copy UnderlineItem / TabNavLink classes (#31).
  const host = document.createElement('div');
  host.id = BUTTON_HOST_ID;
  host.className = 'gprv-view-diff-inline-host';
  host.setAttribute('data-gprv-role', 'files-adjacent');
  host.append(button);

  const listItem = control.closest('li');
  const nav = listItem?.closest('nav') ?? control.closest('nav');
  const overflowNav =
    nav?.getAttribute('data-overflow-mode') != null ||
    nav?.querySelector('[data-component="overflow-menu-button"]') != null;

  if (listItem && nav && overflowNav) {
    pinHostBesideFiles(host, control, nav);
    return true;
  }

  // Classic TabNav: bare anchors — insert after Files changed.
  const anchor = listItem ?? control;
  const parent = anchor.parentElement;
  if (!parent) {
    return false;
  }
  parent.insertBefore(host, anchor.nextSibling);
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
  pullRequestKey: string,
  onOpen: (pullRequestUrl: string) => void,
  onPrefetch: (pullRequestUrl: string) => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.dataset.gprvPr = pullRequestKey;
  button.className = VIEW_DIFF_BUTTON_CLASS;
  button.setAttribute('aria-label', 'View Diff');
  button.innerHTML = `${VIEW_DIFF_ICON_SVG}<span class="gprv-view-diff-label">View Diff</span>`;

  // Resolved per event so the button never opens a stale PR after a client-side navigation.
  const currentUrl = () => parseCurrentPullRequestUrl()?.url ?? location.href;

  button.addEventListener('mouseenter', () => {
    onPrefetch(currentUrl());
  });

  button.addEventListener('focusin', () => {
    onPrefetch(currentUrl());
  });

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen(currentUrl());
  });

  return button;
}

export function isPullRequestPage(url: string): boolean {
  return parseGitHubPullRequestUrl(url) != null;
}
