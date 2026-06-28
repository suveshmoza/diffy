import { CodeView, type CodeViewHandle, type CodeViewProps } from '@pierre/diffs/react';
import { type Ref, useMemo } from 'react';

import { useDiffThemeProps } from '@/providers/theming/useDiffThemeProps';
import { useWorkerDiffTheme } from '@/providers/theming/useWorkerDiffTheme';

type ThemedCodeViewComponent = <LAnnotation = undefined>(
  props: CodeViewProps<LAnnotation> & {
    ref?: Ref<CodeViewHandle<LAnnotation>>;
  },
) => React.JSX.Element;

export const ThemedCodeView: ThemedCodeViewComponent = <LAnnotation = undefined,>({
  disableWorkerPool = false,
  options,
  ref,
  ...props
}: CodeViewProps<LAnnotation> & {
  ref?: Ref<CodeViewHandle<LAnnotation>>;
}): React.JSX.Element => {
  const diffTheme = useDiffThemeProps();
  useWorkerDiffTheme(diffTheme.theme, disableWorkerPool);
  const themedOptions = useMemo(
    () => ({
      ...options,
      theme: diffTheme.theme,
      themeType: options?.themeType ?? diffTheme.themeType,
    }),
    [diffTheme, options],
  );
  return (
    <CodeView<LAnnotation>
      {...props}
      ref={ref}
      disableWorkerPool={disableWorkerPool}
      options={themedOptions}
    />
  );
};
