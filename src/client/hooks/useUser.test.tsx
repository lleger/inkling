import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUser } from "./useUser";

const useSessionMock = vi.fn();
vi.mock("../lib/auth-client", () => ({
  useSession: () => useSessionMock(),
}));

describe("useUser", () => {
  it("returns null when there is no session", () => {
    useSessionMock.mockReturnValue({ data: null });
    const { result } = renderHook(() => useUser());
    expect(result.current).toBeNull();
  });

  it("returns sub + email from the session user", () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-123", email: "logan@hiive.com" } },
    });
    const { result } = renderHook(() => useUser());
    expect(result.current).toEqual({ sub: "user-123", email: "logan@hiive.com" });
  });
});
