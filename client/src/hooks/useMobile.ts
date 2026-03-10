import { useState, useEffect, useCallback } from "react";

interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarOpen: boolean;
  activeSection: string;
}

export function useMobile() {
  const [state, setState] = useState<MobileState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    sidebarOpen: false,
    activeSection: "Project",
  });

  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      setState((prev) => ({
        ...prev,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      }));
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  const openSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarOpen: true }));
  }, []);

  const closeSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarOpen: false }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const setActiveSection = useCallback((section: string) => {
    setState((prev) => ({ ...prev, activeSection: section }));
  }, []);

  return {
    isMobile: state.isMobile,
    isTablet: state.isTablet,
    isDesktop: state.isDesktop,
    sidebarOpen: state.sidebarOpen,
    activeSection: state.activeSection,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    setActiveSection,
  };
}
