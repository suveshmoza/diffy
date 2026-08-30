import { IconArrowNarrowLeft, IconCheck, IconCopy } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';

import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';

type BranchContextPopoverProps = {
  baseRef: string;
  headRef: string;
};

export const BranchContextPopover = memo(function BranchContextPopover({
  baseRef,
  headRef,
}: BranchContextPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const summary = `${baseRef} ← ${headRef}`;

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  usePopoverDismiss(isOpen, rootRef, close);

  return (
    <div
      ref={rootRef}
      className='gprv-header-popover gprv-branch-context'
    >
      <button
        type='button'
        className='gprv-branch-context-trigger'
        aria-haspopup='dialog'
        aria-expanded={isOpen}
        aria-controls={panelId}
        title={summary}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className='gprv-branch-context-summary'>
          <span className='gprv-branch-context-base'>{baseRef}</span>
          <IconArrowNarrowLeft
            className='gprv-branch-context-arrow'
            size={14}
            aria-hidden='true'
          />
          <span className='gprv-branch-context-head'>{headRef}</span>
        </span>
      </button>

      {isOpen ? (
        <div
          id={panelId}
          className='gprv-header-popover-menu gprv-branch-context-menu'
          role='dialog'
          aria-label='Branch names'
        >
          <CopyableBranchRow
            label='Base'
            name={baseRef}
          />
          <CopyableBranchRow
            label='Head'
            name={headRef}
          />
        </div>
      ) : null}
    </div>
  );
});

type CopyableBranchRowProps = {
  label: string;
  name: string;
};

function CopyableBranchRow({ label, name }: CopyableBranchRowProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const copy = useCallback(async () => {
    setCopied(true);
    if (resetTimerRef.current != null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setCopied(false), 750);

    try {
      await navigator.clipboard.writeText(name);
    } catch {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
      setCopied(false);
    }
  }, [name]);

  return (
    <div className='gprv-branch-context-row'>
      <span className='gprv-branch-context-row-label'>{label}</span>
      <button
        type='button'
        className='gprv-branch-context-copy'
        title={`Copy ${name}`}
        aria-label={copied ? `Copied branch ${name}` : `Copy branch ${name}`}
        onClick={() => void copy()}
      >
        <code className='gprv-branch-context-name'>{name}</code>
        <span
          className='gprv-branch-copy-status'
          data-copied={copied ? '' : undefined}
          aria-hidden='true'
        >
          <IconCopy
            className='gprv-branch-copy-icon'
            size={14}
            stroke={2}
          />
          <IconCheck
            className='gprv-branch-check-icon'
            size={14}
            stroke={2.5}
          />
        </span>
      </button>
    </div>
  );
}
