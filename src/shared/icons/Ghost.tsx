import type { CSSProperties } from 'react';

type IconGhostProps = {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/** Placeholder ghost — replace SVG paths when final art is ready. */
export function IconGhost({ size = 16, color = 'currentColor', className, style }: IconGhostProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 16 16'
      width={size}
      height={size}
      fill={color}
      className={className}
      style={style}
      aria-hidden
    >
      <path d='M8 1C5.24 1 3 3.24 3 6v4.5c0 .83.67 1.5 1.5 1.5.55 0 1.05-.3 1.31-.78l.69-1.22.69 1.22c.26.48.76.78 1.31.78s1.05-.3 1.31-.78l.69-1.22.69 1.22c.26.48.76.78 1.31.78.83 0 1.5-.67 1.5-1.5V6c0-2.76-2.24-5-5-5Zm-1.25 5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Zm3.5 0a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z' />
    </svg>
  );
}
