import { IconChevron, type IconProps } from '@pierre/icons';

type ChevronProps = IconProps;

export function IconChevronDown(props: ChevronProps) {
  return <IconChevron {...props} />;
}

export function IconChevronLeft(props: ChevronProps) {
  return (
    <IconChevron
      {...props}
      style={{ ...props.style, transform: 'rotate(90deg)' }}
    />
  );
}

export function IconChevronRight(props: ChevronProps) {
  return (
    <IconChevron
      {...props}
      style={{ ...props.style, transform: 'rotate(-90deg)' }}
    />
  );
}
