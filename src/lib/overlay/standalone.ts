/** True when overlay.html is opened directly in a browser tab (not embedded in an iframe). */
export function isStandaloneOverlay(): boolean {
  return window === window.parent;
}
