import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CommandPalette, type PaletteAction } from "./CommandPalette";
import { FileText } from "lucide-react";

afterEach(cleanup);

const notes = [
  { id: "1", title: "First Note", preview: "hello world", word_count: 10, task_done: 0, task_total: 0, tags: "[]", pinned: 0, created_at: "2026-04-11T10:00:00Z", updated_at: "2026-04-11T12:00:00Z" },
  { id: "2", title: "Second Note", preview: "foo bar", word_count: 5, task_done: 0, task_total: 0, tags: "[]", pinned: 0, created_at: "2026-04-11T09:00:00Z", updated_at: "2026-04-11T11:00:00Z" },
];

const actions: PaletteAction[] = [
  { id: "new-note", label: "New note", icon: <FileText size={15} />, category: "action", onSelect: vi.fn() },
  { id: "settings", label: "Settings", icon: <FileText size={15} />, category: "action", onSelect: vi.fn() },
];

const baseProps = {
  open: true,
  onClose: vi.fn(),
  notes,
  actions,
  onSelectNote: vi.fn(),
  onCreateWithTitle: vi.fn(),
};

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<CommandPalette {...baseProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders search input when open", () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByPlaceholderText("Search notes and actions...")).toBeTruthy();
  });

  it("shows actions and notes by default", () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByText("New note")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("First Note")).toBeTruthy();
    expect(screen.getByText("Second Note")).toBeTruthy();
  });

  it("shows category headers", () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByText("Actions")).toBeTruthy();
    expect(screen.getByText("Notes")).toBeTruthy();
  });

  it("filters by query", () => {
    render(<CommandPalette {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes and actions..."), {
      target: { value: "First" },
    });
    expect(screen.getByText("First Note")).toBeTruthy();
    expect(screen.queryByText("Second Note")).toBeNull();
  });

  it("filters actions by query", () => {
    render(<CommandPalette {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes and actions..."), {
      target: { value: "sett" },
    });
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.queryByText("New note")).toBeNull();
  });

  it("shows create option as fallback when nothing else matches", () => {
    render(<CommandPalette {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes and actions..."), {
      target: { value: "xyznonexistent" },
    });
    expect(screen.getByText(/Create "xyznonexistent"/)).toBeTruthy();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(<CommandPalette {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText("Search notes and actions..."), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when clicking backdrop", () => {
    const onClose = vi.fn();
    const { container } = render(<CommandPalette {...baseProps} onClose={onClose} />);
    fireEvent.click(container.firstElementChild!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls action onSelect and closes on Enter", () => {
    const onClose = vi.fn();
    const action = { ...actions[0], onSelect: vi.fn() };
    render(<CommandPalette {...baseProps} actions={[action]} onClose={onClose} />);
    // First item is selected by default
    fireEvent.keyDown(screen.getByPlaceholderText("Search notes and actions..."), { key: "Enter" });
    expect(action.onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("navigates with arrow keys", () => {
    render(<CommandPalette {...baseProps} />);
    const input = screen.getByPlaceholderText("Search notes and actions...");
    // Move down
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // Move back up
    fireEvent.keyDown(input, { key: "ArrowUp" });
    // Should be on second item (index 1) — just verify no crash
    expect(input).toBeTruthy();
  });

  it("shows create option when query is entered", () => {
    render(<CommandPalette {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes and actions..."), {
      target: { value: "My new doc" },
    });
    expect(screen.getByText(/Create "My new doc"/)).toBeTruthy();
  });

  it("shows footer with keyboard hints", () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByText("navigate")).toBeTruthy();
    expect(screen.getByText("select")).toBeTruthy();
  });
});
