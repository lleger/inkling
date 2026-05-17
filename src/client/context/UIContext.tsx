import { Toast as BaseToast } from "@base-ui/react/toast";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ToastViewport, type ToastAction, type ToastData } from "../components/Toast";
import type { SaveStatus } from "../types";

export interface ToastOptions {
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface UIContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  sidebarWidth: number;
  setSidebarWidth: (v: number | ((p: number) => number)) => void;
  focusMode: boolean;
  setFocusMode: (v: boolean | ((p: boolean) => boolean)) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  folderModalOpen: boolean;
  setFolderModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  metaPanelOpen: boolean;
  setMetaPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  saveStatus: SaveStatus;
  setSaveStatus: (v: SaveStatus) => void;
  showToast: (toast: ToastOptions) => string;
  closeToast: (toastId?: string) => void;
}

const UIContext = createContext<UIContextValue | null>(null);
const toastEventName = "inkling:toast";
export const desktopSidebarQuery = "(min-width: 1024px)";
const desktopSidebarMinWidth = 1024;
export const defaultSidebarWidth = 224;
export const minSidebarWidth = defaultSidebarWidth;
export const maxSidebarWidth = 384;
const sidebarWidthStorageKey = "inkling:sidebar-width";

export function clampSidebarWidth(width: number) {
  return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, Math.round(width)));
}

function getStoredSidebarWidth() {
  if (typeof window === "undefined") return defaultSidebarWidth;
  const raw = window.localStorage.getItem(sidebarWidthStorageKey);
  if (raw === null) return defaultSidebarWidth;
  const stored = Number(raw);
  return Number.isFinite(stored) ? clampSidebarWidth(stored) : defaultSidebarWidth;
}

export function getDefaultSidebarOpen() {
  if (typeof window === "undefined") return true;
  return document.documentElement.clientWidth >= desktopSidebarMinWidth;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}

export function emitToast(toast: ToastOptions) {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent<ToastOptions>(toastEventName, { detail: toast }));
}

export function UIProvider({ children }: { children: ReactNode }) {
  return (
    <BaseToast.Provider timeout={5000} limit={3}>
      <UIProviderContent>{children}</UIProviderContent>
    </BaseToast.Provider>
  );
}

function UIProviderContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(getDefaultSidebarOpen);
  const [sidebarWidth, setSidebarWidthState] = useState(getStoredSidebarWidth);
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [metaPanelOpen, setMetaPanelOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const { add, close } = BaseToast.useToastManager<ToastData>();

  useEffect(() => {
    const mediaQuery = window.matchMedia(desktopSidebarQuery);
    const syncSidebarWithBreakpoint = () => {
      setSidebarOpen(getDefaultSidebarOpen());
    };

    mediaQuery.addEventListener("change", syncSidebarWithBreakpoint);
    window.addEventListener("resize", syncSidebarWithBreakpoint);
    window.visualViewport?.addEventListener("resize", syncSidebarWithBreakpoint);
    return () => {
      mediaQuery.removeEventListener("change", syncSidebarWithBreakpoint);
      window.removeEventListener("resize", syncSidebarWithBreakpoint);
      window.visualViewport?.removeEventListener("resize", syncSidebarWithBreakpoint);
    };
  }, []);

  const showToast = useCallback(
    (toast: ToastOptions) =>
      add({
        description: toast.message,
        timeout: toast.duration,
        data: { action: toast.action },
      }),
    [add],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const toast = (event as CustomEvent<ToastOptions>).detail;
      if (toast?.message) showToast(toast);
    };
    document.addEventListener(toastEventName, handler);
    return () => document.removeEventListener(toastEventName, handler);
  }, [showToast]);

  const setSidebarWidth = useCallback((value: number | ((p: number) => number)) => {
    setSidebarWidthState((previous) => {
      const next = clampSidebarWidth(typeof value === "function" ? value(previous) : value);
      window.localStorage.setItem(sidebarWidthStorageKey, String(next));
      return next;
    });
  }, []);

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
    <UIContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        sidebarWidth,
        setSidebarWidth,
        focusMode,
        setFocusMode,
        paletteOpen,
        setPaletteOpen,
        folderModalOpen,
        setFolderModalOpen,
        metaPanelOpen,
        setMetaPanelOpen,
        saveStatus,
        setSaveStatus,
        showToast,
        closeToast: close,
      }}
    >
      {children}
      <ToastViewport hostedInSidebar={sidebarOpen && !focusMode} sidebarWidth={sidebarWidth} />
    </UIContext.Provider>
  );
}
