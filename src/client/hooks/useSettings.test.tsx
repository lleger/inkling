import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSettings } from "./useSettings";
import { makeQueryWrapper } from "./test-utils";
import * as api from "../lib/api";

vi.mock("../lib/api");

const STORAGE_KEY = "inkling-settings";

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.saveSettings).mockResolvedValue(undefined);
});

describe("useSettings", () => {
  it("returns default settings when nothing is cached", () => {
    vi.mocked(api.fetchSettings).mockResolvedValue({} as any);
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    expect(result.current.settings.theme).toBe("system");
    expect(result.current.settings.accent).toBe("orange");
    expect(result.current.settings.defaultMode).toBe("richtext");
    expect(result.current.settings.smartTypography).toBe(true);
    expect(result.current.settings.dailyNoteFolder).toBe("Daily");
  });

  it("hydrates from localStorage cache synchronously", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: "dark", accent: "purple",
    }));
    vi.mocked(api.fetchSettings).mockResolvedValue({} as any);
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    // Available before query resolves
    expect(result.current.settings.theme).toBe("dark");
    expect(result.current.settings.accent).toBe("purple");
    // Defaults filled in for missing keys
    expect(result.current.settings.defaultMode).toBe("richtext");
  });

  it("merges remote settings over local cache once fetched", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: "dark" }));
    vi.mocked(api.fetchSettings).mockResolvedValue({
      theme: "light",
      accent: "blue",
    } as any);
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.settings.theme).toBe("light");
    expect(result.current.settings.accent).toBe("blue");
  });

  it("update() writes to state, localStorage, and API", async () => {
    vi.mocked(api.fetchSettings).mockResolvedValue({} as any);
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    await act(async () => {
      result.current.update({ theme: "dark" });
    });

    expect(result.current.settings.theme).toBe("dark");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.theme).toBe("dark");
    expect(api.saveSettings).toHaveBeenCalled();
  });

  it("update() merges with existing settings (does not replace)", async () => {
    vi.mocked(api.fetchSettings).mockResolvedValue({} as any);
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    await act(async () => {
      result.current.update({ theme: "dark" });
    });
    await act(async () => {
      result.current.update({ accent: "purple" });
    });

    expect(result.current.settings.theme).toBe("dark");
    expect(result.current.settings.accent).toBe("purple");
  });

  it("ignores empty remote settings response (preserves local)", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: "dark" }));
    vi.mocked(api.fetchSettings).mockResolvedValue({} as any);
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    // Empty {} from server should not clobber local "dark"
    expect(result.current.settings.theme).toBe("dark");
  });
});
