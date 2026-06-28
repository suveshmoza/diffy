declare module '@pierre/diffs/worker/worker.js?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

declare module '@pierre/diffs/dist/style.js' {
  const css: string;
  export default css;
}

declare module '@pierre/diffs/theme-resolver' {
  import type { ThemeResolver } from '@pierre/theming';

  export const themeResolver: ThemeResolver;
}
