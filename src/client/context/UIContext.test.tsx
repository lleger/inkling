import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { desktopSidebarQuery, UIProvider, useUI } from "./UIContext";

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const setClientWidth = (isDesktop: boolean) => {
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: isDesktop ? 1200 : 900,
    });
  };

  setClientWidth(initialMatches);

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) =>
      listeners.delete(fn),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as any;

  return {
    setMatches(nextMatches: boolean, notify = true) {
      matches = nextMatches;
      setClientWidth(nextMatches);
      if (!notify) return;
      const event = { matches: nextMatches } as MediaQueryListEvent;
      for (const listener of listeners) listener(event);
    },
  };
}

function SidebarState() {
  const ui = useUI();
  return <div data-testid="sidebar-state">{ui.sidebarOpen ? "open" : "closed"}</div>;
}

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(cleanup);

describe("UIProvider", () => {
  it("starts open at desktop sizes", () => {
    mockMatchMedia(true);

    render(
      <UIProvider>
        <SidebarState />
      </UIProvider>,
    );

    expect(screen.getByTestId("sidebar-state").textContent).toBe("open");
  });

  it("starts closed at non-desktop sizes", () => {
    mockMatchMedia(false);

    render(
      <UIProvider>
        <SidebarState />
      </UIProvider>,
    );

    expect(screen.getByTestId("sidebar-state").textContent).toBe("closed");
  });

  it("closes the sidebar when entering non-desktop sizes", () => {
    const media = mockMatchMedia(true);

    render(
      <UIProvider>
        <SidebarState />
      </UIProvider>,
    );

    expect(screen.getByTestId("sidebar-state").textContent).toBe("open");

    act(() => media.setMatches(false));

    expect(screen.getByTestId("sidebar-state").textContent).toBe("closed");
  });

  it("opens the sidebar when returning to desktop sizes", () => {
    const media = mockMatchMedia(false);

    render(
      <UIProvider>
        <SidebarState />
      </UIProvider>,
    );

    expect(screen.getByTestId("sidebar-state").textContent).toBe("closed");

    act(() => media.setMatches(true));

    expect(screen.getByTestId("sidebar-state").textContent).toBe("open");
  });

  it("keeps the desktop default on resize within desktop sizes", () => {
    const media = mockMatchMedia(true);

    render(
      <UIProvider>
        <SidebarState />
      </UIProvider>,
    );

    expect(screen.getByTestId("sidebar-state").textContent).toBe("open");

    act(() => {
      media.setMatches(true, false);
      window.dispatchEvent(new Event("resize"));
    });

    expect(screen.getByTestId("sidebar-state").textContent).toBe("open");
  });

  it("keeps the non-desktop default on resize within non-desktop sizes", () => {
    const media = mockMatchMedia(false);

    render(
      <UIProvider>
        <SidebarState />
      </UIProvider>,
    );

    expect(screen.getByTestId("sidebar-state").textContent).toBe("closed");

    act(() => media.setMatches(true));
    expect(screen.getByTestId("sidebar-state").textContent).toBe("open");

    act(() => {
      media.setMatches(false, false);
      window.dispatchEvent(new Event("resize"));
    });

    expect(screen.getByTestId("sidebar-state").textContent).toBe("closed");
  });

  it("syncs the sidebar on resize when media query change events are not dispatched", () => {
    const media = mockMatchMedia(true);

    render(
      <UIProvider>
        <SidebarState />
      </UIProvider>,
    );

    expect(screen.getByTestId("sidebar-state").textContent).toBe("open");

    act(() => {
      media.setMatches(false, false);
      window.dispatchEvent(new Event("resize"));
    });

    expect(screen.getByTestId("sidebar-state").textContent).toBe("closed");
  });

  it("uses Tailwind lg as the desktop sidebar breakpoint", () => {
    expect(desktopSidebarQuery).toBe("(min-width: 1024px)");
  });
});
