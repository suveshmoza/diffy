import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const MOBILE_SIDEBAR_QUERY = '(max-width: 767px)';

type SidebarContextValue = {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function getIsMobileSidebarViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_SIDEBAR_QUERY).matches;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => getIsMobileSidebarViewport());

  useEffect(() => {
    const media = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    const syncViewport = () => {
      // Crossing the breakpoint resets to the mode default: closed sheet on
      // mobile, open column on desktop.
      setIsSidebarCollapsed(media.matches);
    };

    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((collapsed) => !collapsed);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarCollapsed(true);
  }, []);

  return (
    <SidebarContext.Provider value={{ isSidebarCollapsed, toggleSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within SidebarProvider');
  }
  return context;
}

export { MOBILE_SIDEBAR_QUERY };
