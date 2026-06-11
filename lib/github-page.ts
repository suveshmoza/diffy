import { parseCurrentPullRequestUrl, parseGitHubPullRequestUrl } from './github';

const BUTTON_ID = 'github-pr-viewer-button';
const ROOT_ID = 'github-pr-viewer-root';

type ViewDiffButtonCallbacks = {
  onOpen: (pullRequestUrl: string) => void;
  onPrefetch: (pullRequestUrl: string) => void;
};

let buttonInstaller: { disconnect: () => void } | null = null;
let buttonCallbacks: ViewDiffButtonCallbacks | null = null;

export function installViewDiffButton(
  onOpen: (pullRequestUrl: string) => void,
  onPrefetch: (pullRequestUrl: string) => void,
): { disconnect: () => void } {
  if (buttonInstaller) {
    return buttonInstaller;
  }

  buttonCallbacks = { onOpen, onPrefetch };
  const observer = new MutationObserver(() => {
    if (buttonCallbacks) {
      syncViewDiffButton(buttonCallbacks.onOpen, buttonCallbacks.onPrefetch);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const disconnect = () => {
    observer.disconnect();
    removeViewDiffButton();
    buttonInstaller = null;
    buttonCallbacks = null;
  };

  buttonInstaller = { disconnect };
  syncViewDiffButton(onOpen, onPrefetch);
  return buttonInstaller;
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

  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  const anchorControl = findAnchorControl();
  const button = createButton(anchorControl, ref.url, onOpen);
  const insertion = anchorControl ? findInsertionPoint(anchorControl) : null;

  if (insertion) {
    insertion.container.append(button);
    return;
  }

  const fallback = document.querySelector<HTMLElement>('.gh-header-actions, [data-testid="pull-request-header-actions"]');
  if (fallback) {
    fallback.prepend(button);
    return;
  }

  const titleHeader = document.querySelector<HTMLElement>('.gh-header-title, [data-testid="pull-request-header"]');
  titleHeader?.append(button);
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

  button.addEventListener('click', () => onOpen(pullRequestUrl));
  return button;
}

function findInsertionPoint(control: HTMLAnchorElement | HTMLButtonElement): { container: HTMLElement } | null {
  const parent = control.parentElement;
  if (!parent) {
    return null;
  }

  return { container: parent };
}

function findAnchorControl(): HTMLAnchorElement | HTMLButtonElement | null {
  const selectors = [
    'a[href*="/files"]',
    'button[data-hotkey="g p"]',
    'a[data-tab-item="files-changed-tab"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector<HTMLAnchorElement | HTMLButtonElement>(selector);
    if (element) {
      return element;
    }
  }

  const controls = Array.from(document.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('a.btn, button.btn'));
  return (
    controls.find((control) => control.textContent?.toLowerCase().includes('files changed')) ??
    controls.find((control) => control.textContent?.toLowerCase().includes('conversation')) ??
    null
  );
}

export function isPullRequestPage(url: string): boolean {
  return parseGitHubPullRequestUrl(url) != null;
}
