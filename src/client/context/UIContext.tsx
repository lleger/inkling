import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface ToastState {
  message: string;
  action?: { label: string; onClick: () => void };
}

interface UIContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  focusMode: boolean;
  setFocusMode: (v: boolean | ((p: boolean) => boolean)) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  folderModalOpen: boolean;
  setFolderModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  toast: ToastState | null;
  setToast: (t: ToastState | null) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Cmd+K and Escape (focus mode)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape" && focusMode) {
        e.preventDefault();
        setFocusMode(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusMode]);

  return (
    <UIContext.Provider value={{
      sidebarOpen, setSidebarOpen,
      focusMode, setFocusMode,
      paletteOpen, setPaletteOpen,
      settingsOpen, setSettingsOpen,
      folderModalOpen, setFolderModalOpen,
      toast, setToast,
    }}>
      {children}
    </UIContext.Provider>
  );
}
