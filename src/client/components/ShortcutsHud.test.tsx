import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ShortcutsHud } from "./ShortcutsHud";

afterEach(cleanup);

describe("ShortcutsHud", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<ShortcutsHud open={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders shortcut list when open", () => {
    render(<ShortcutsHud open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Keyboard Shortcuts")).toBeTruthy();
    expect(screen.getByText("New note")).toBeTruthy();
    expect(screen.getByText("Toggle mode")).toBeTruthy();
    expect(screen.getByText("Bold")).toBeTruthy();
  });

  it("shows markdown context badges on formatting shortcuts", () => {
    render(<ShortcutsHud open={true} onClose={vi.fn()} />);
    const badges = screen.getAllByText("markdown");
    expect(badges.length).toBe(3);
  });

  it("calls onClose when clicking the backdrop overlay", () => {
    const onClose = vi.fn();
    const { container } = render(<ShortcutsHud open={true} onClose={onClose} />);
    // The overlay is the outermost div with the fixed class
    const overlay = container.firstElementChild!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when clicking inside the modal", () => {
    const onClose = vi.fn();
    render(<ShortcutsHud open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Keyboard Shortcuts"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<ShortcutsHud open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
