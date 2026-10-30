import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Key-value metadata primitives. Compose them:
 *
 *   <PropertyList>
 *     <Property>
 *       <PropertyLabel icon={<IconX size={12} />}>Label</PropertyLabel>
 *       <PropertyValue>Value</PropertyValue>
 *     </Property>
 *   </PropertyList>
 *
 * Renders a real <dl>, so screen readers announce label/value pairs.
 */

export function PropertyList({ className, ...props }: ComponentProps<'dl'>) {
  return (
    <dl
      className={cn('m-0 flex flex-col gap-1.5', className)}
      {...props}
    />
  );
}

export function Property({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex min-h-6 items-center justify-between gap-3', className)}
      {...props}
    />
  );
}

type PropertyLabelProps = ComponentProps<'dt'> & {
  icon?: ReactNode;
};

export function PropertyLabel({ icon, className, children, ...props }: PropertyLabelProps) {
  return (
    <dt
      className={cn(
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground',
        className,
      )}
      {...props}
    >
      {icon ? (
        <span
          aria-hidden
          className='flex shrink-0'
        >
          {icon}
        </span>
      ) : null}
      {children}
    </dt>
  );
}

export function PropertyValue({ className, ...props }: ComponentProps<'dd'>) {
  return (
    <dd
      className={cn('m-0 flex min-w-0 items-center justify-end gap-1.5 text-xs', className)}
      {...props}
    />
  );
}
