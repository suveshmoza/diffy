import { CodeView, type CodeViewHandle, type CodeViewProps } from '@pierre/diffs/react';
import { type Ref, useMemo } from 'react';

import { DIFF_HIGHLIGHTER } from '@/lib/diff/highlighter';
import { useDiffThemeProps } from '@/providers/theming/useDiffThemeProps';
import { useWorkerDiffTheme } from '@/providers/theming/useWorkerDiffTheme';

type ThemedCodeViewComponent = <LAnnotation = undefined, Caret = undefined>(
  props: CodeViewProps<LAnnotation, Caret> & {
    ref?: Ref<CodeViewHandle<LAnnotation, Caret>>;
  },
) => React.JSX.Element;

export const ThemedCodeView: ThemedCodeViewComponent = <
  LAnnotation = undefined,
  Caret = undefined,
>({
  disableWorkerPool = false,
  options,
  ref,
  ...props
}: CodeViewProps<LAnnotation, Caret> & {
  ref?: Ref<CodeViewHandle<LAnnotation, Caret>>;
}): React.JSX.Element => {
  const diffTheme = useDiffThemeProps();
  useWorkerDiffTheme(diffTheme.theme, disableWorkerPool);
  const themedOptions = useMemo(
    () => ({
      ...options,
      theme: diffTheme.theme,
      themeType: options?.themeType ?? diffTheme.themeType,
      preferredHighlighter: DIFF_HIGHLIGHTER,
    }),
    [diffTheme, options],
  );
  return (
    <CodeView<LAnnotation, Caret>
      {...props}
      ref={ref}
      disableWorkerPool={disableWorkerPool}
      options={themedOptions}
    />
  );
};
