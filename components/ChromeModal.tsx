import type { ReactNode } from 'react';

type ChromeModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function ChromeModal({ title, children, onClose }: ChromeModalProps) {
  return (
    <>
      <div className="gprv-backdrop" onClick={onClose} />
      <section className="gprv-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="gprv-header">
          <div className="gprv-title">
            <strong>{title}</strong>
          </div>
          <button className="gprv-close" type="button" onClick={onClose} aria-label="Close View Diff">
            ✕
          </button>
        </header>
        {children}
      </section>
    </>
  );
}
