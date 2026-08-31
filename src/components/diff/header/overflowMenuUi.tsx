import type { ReactNode } from 'react';

import { IconChevronLeft, IconChevronRight } from '@/components/icons/Chevron';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type OverflowMenuSectionHeadingProps = {
  id?: string;
  label: string;
  icon?: ReactNode;
};

export function OverflowMenuSectionHeading({ id, label, icon }: OverflowMenuSectionHeadingProps) {
  return (
    <h3
      id={id}
      className='flex items-center gap-1.5 px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase'
    >
      {icon ? (
        <span
          className='inline-flex size-3.5 shrink-0 items-center justify-center opacity-80'
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </h3>
  );
}

type OverflowMenuSectionProps = {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function OverflowMenuSection({
  label,
  icon,
  children,
  className,
}: OverflowMenuSectionProps) {
  return (
    <section className={cn('flex flex-col', className)}>
      <OverflowMenuSectionHeading
        label={label}
        icon={icon}
      />
      <div className='flex flex-col gap-0.5 px-0.5 pb-1'>{children}</div>
    </section>
  );
}

type OverflowMenuItemProps = {
  icon?: ReactNode;
  label: string;
  suffix?: ReactNode;
  value?: string;
  disabled?: boolean;
  selected?: boolean;
  role?: string;
  onClick: () => void;
};

export function OverflowMenuItem({
  icon,
  label,
  suffix,
  value,
  disabled = false,
  selected = false,
  role = 'menuitem',
  onClick,
}: OverflowMenuItemProps) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      role={role}
      disabled={disabled}
      aria-selected={selected || undefined}
      onClick={onClick}
      className={cn(
        'h-8 w-full justify-start gap-2 px-2 text-sm font-normal',
        selected && 'bg-accent text-accent-foreground',
      )}
    >
      {icon ? (
        <span className='inline-flex size-4 shrink-0 items-center justify-center opacity-80'>
          {icon}
        </span>
      ) : null}
      <span className='min-w-0 flex-1 truncate text-left'>{label}</span>
      {value ? (
        <span className='max-w-36 truncate text-xs text-muted-foreground'>{value}</span>
      ) : null}
      {suffix ? (
        <span className='inline-flex size-4 shrink-0 items-center justify-center opacity-70'>
          {suffix}
        </span>
      ) : null}
    </Button>
  );
}

type OverflowMenuBackHeaderProps = {
  label: string;
  onClick: () => void;
};

export function OverflowMenuBackHeader({ label, onClick }: OverflowMenuBackHeaderProps) {
  return (
    <div className='sticky top-0 z-10 border-b bg-popover'>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={onClick}
        className='h-9 w-full justify-start gap-2 rounded-none px-2 text-sm font-medium'
      >
        <IconChevronLeft size={12} />
        <span>{label}</span>
      </Button>
    </div>
  );
}

type OverflowMenuSettingsRowProps = {
  label: string;
  children: ReactNode;
};

export function OverflowMenuSettingsRow({ label, children }: OverflowMenuSettingsRowProps) {
  return (
    <div className='flex items-center justify-between gap-3 px-2 py-1'>
      <span className='text-sm'>{label}</span>
      {children}
    </div>
  );
}

type OverflowMenuPickerItemProps = {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
};

export function OverflowMenuPickerItem({
  icon,
  label,
  value,
  onClick,
}: OverflowMenuPickerItemProps) {
  return (
    <OverflowMenuItem
      icon={icon}
      label={label}
      value={value}
      suffix={
        <IconChevronRight
          size={16}
          className='rotate-0'
        />
      }
      onClick={onClick}
    />
  );
}

type OverflowMenuPanelProps = {
  id?: string;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
};

export function OverflowMenuPanel({ id, ariaLabel, children, className }: OverflowMenuPanelProps) {
  return (
    <div
      id={id}
      role='dialog'
      aria-label={ariaLabel}
      className={cn('max-h-[min(70vh,480px)] overflow-y-auto overscroll-contain', className)}
    >
      {children}
    </div>
  );
}

type OverflowMenuSettingsSectionProps = {
  id: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  isLast?: boolean;
};

export function OverflowMenuSettingsSection({
  id,
  label,
  icon,
  children,
  isLast = false,
}: OverflowMenuSettingsSectionProps) {
  return (
    <section
      className='flex flex-col gap-1'
      aria-labelledby={id}
    >
      <OverflowMenuSectionHeading
        id={id}
        label={label}
        icon={icon}
      />
      <div className='flex flex-col gap-1 px-0.5'>{children}</div>
      {!isLast ? <Separator className='my-2' /> : null}
    </section>
  );
}
