import { themeResolver } from '@pierre/diffs/theme-resolver';
import { pierreThemes } from '@pierre/theming/themes';

for (const descriptor of pierreThemes.getThemes()) {
  themeResolver.registerThemeIfAbsent(descriptor.name, descriptor.load);
}
