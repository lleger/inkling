import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUser } from "./useUser";
import { makeQueryWrapper } from "./test-utils";
import * as api from "../lib/api";

vi.mock("../lib/api");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useUser", () => {
  it("returns null while loading", () => {
    vi.mocked(api.fetchUser).mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });
    expect(result.current).toBeNull();
  });

  it("returns the user once fetched", async () => {
    vi.mocked(api.fetchUser).mockResolvedValue({
      sub: "user-123",
      email: "logan@hiive.com",
    });
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual({ sub: "user-123", email: "logan@hiive.com" });
  });

  it("returns null on fetch error", async () => {
    vi.mocked(api.fetchUser).mockRejectedValue(new Error("boom"));
    const { Wrapper } = makeQueryWrapper();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });

    // Wait briefly for the rejection to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current).toBeNull();
  });
});
