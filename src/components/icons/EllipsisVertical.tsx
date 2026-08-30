import { IconEllipsis, type IconProps } from '@pierre/icons';

export function IconEllipsisVertical(props: IconProps) {
  return (
    <IconEllipsis
      {...props}
      style={{ ...props.style, transform: 'rotate(90deg)' }}
    />
  );
}
