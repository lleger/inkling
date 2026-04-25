import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTheme } from "./useTheme";

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as any;
  return listeners;
}

beforeEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("useTheme", () => {
  it("returns 'light' when preference is light", () => {
    const { result } = renderHook(() => useTheme("light"));
    expect(result.current).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("returns 'dark' and adds .dark class when preference is dark", () => {
    const { result } = renderHook(() => useTheme("dark"));
    expect(result.current).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("resolves 'system' to dark when prefers-color-scheme: dark", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme("system"));
    expect(result.current).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("resolves 'system' to light when prefers-color-scheme: light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme("system"));
    expect(result.current).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("re-resolves when preference changes", () => {
    const { result, rerender } = renderHook(({ pref }) => useTheme(pref), {
      initialProps: { pref: "light" as const },
    });
    expect(result.current).toBe("light");

    rerender({ pref: "dark" as const });
    expect(result.current).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
