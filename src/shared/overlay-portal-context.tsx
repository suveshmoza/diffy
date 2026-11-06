import { createContext, useContext, type ReactNode } from 'react';

const OverlayPortalContext = createContext<HTMLElement | null>(null);

type OverlayPortalProviderProps = {
  container: HTMLElement | null;
  children: ReactNode;
};

/** Portals overlay UI (popovers, dialogs) into the modal so theme tokens apply. */
export function OverlayPortalProvider({ container, children }: OverlayPortalProviderProps) {
  return (
    <OverlayPortalContext.Provider value={container}>{children}</OverlayPortalContext.Provider>
  );
}

export function useOverlayPortalContainer(): HTMLElement | null {
  return useContext(OverlayPortalContext);
}
