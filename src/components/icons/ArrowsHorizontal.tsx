import { IconArrowsUpDown, type IconProps } from '@pierre/icons';

export function IconArrowsHorizontal(props: IconProps) {
  return (
    <IconArrowsUpDown
      {...props}
      style={{ ...props.style, transform: 'rotate(90deg)' }}
    />
  );
}
