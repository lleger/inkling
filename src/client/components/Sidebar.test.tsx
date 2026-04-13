import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

afterEach(cleanup);

const baseProps = {
  onSelectNote: vi.fn(),
  onCreateNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onCollapse: vi.fn(),
  onHome: vi.fn(),
  onOpenSettings: vi.fn(),
  allTags: [],
  selectedTag: null,
  onSelectTag: vi.fn(),
  userEmail: null,
  open: true,
  saveStatus: "saved" as const,
};

const notes = [
  { id: "1", title: "First Note", preview: "Some preview", word_count: 10, task_done: 0, task_total: 0, tags: "[]", created_at: "2026-04-11T10:00:00Z", updated_at: "2026-04-11T12:00:00Z" },
  { id: "2", title: "Second Note", preview: "Another preview", word_count: 5, task_done: 1, task_total: 2, tags: "[]", created_at: "2026-04-11T09:00:00Z", updated_at: "2026-04-11T11:00:00Z" },
];

describe("Sidebar", () => {
  it("renders note titles", () => {
    render(<Sidebar {...baseProps} notes={notes} activeNoteId={null} />);
    expect(screen.getByText("First Note")).toBeTruthy();
    expect(screen.getByText("Second Note")).toBeTruthy();
  });

  it("shows empty state when no notes", () => {
    render(<Sidebar {...baseProps} notes={[]} activeNoteId={null} />);
    expect(screen.getByText("No notes yet")).toBeTruthy();
  });

  it("calls onSelectNote when clicking a note", () => {
    const onSelect = vi.fn();
    render(<Sidebar {...baseProps} notes={notes} activeNoteId={null} onSelectNote={onSelect} />);
    fireEvent.click(screen.getByText("First Note"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("calls onCreateNote when clicking the add button", () => {
    const onCreate = vi.fn();
    render(<Sidebar {...baseProps} notes={[]} activeNoteId={null} onCreateNote={onCreate} />);
    fireEvent.click(screen.getByTitle("New note"));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("calls onCollapse when clicking collapse button", () => {
    const onCollapse = vi.fn();
    render(<Sidebar {...baseProps} notes={[]} activeNoteId={null} onCollapse={onCollapse} />);
    fireEvent.click(screen.getByTitle("Collapse sidebar"));
    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it("calls onOpenSettings when clicking the settings button", () => {
    const onSettings = vi.fn();
    render(<Sidebar {...baseProps} notes={[]} activeNoteId={null} onOpenSettings={onSettings} />);
    fireEvent.click(screen.getByTitle("Settings"));
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it("calls onDeleteNote when clicking delete", () => {
    const onDelete = vi.fn();
    render(<Sidebar {...baseProps} notes={notes} activeNoteId={null} onDeleteNote={onDelete} />);
    const deleteButtons = screen.getAllByTitle("Delete");
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("shows user email in footer", () => {
    render(<Sidebar {...baseProps} notes={[]} activeNoteId={null} userEmail="test@example.com" />);
    expect(screen.getByText("test@example.com")).toBeTruthy();
  });

  it("shows Untitled for notes without a title", () => {
    const untitled = [{ id: "1", title: "", preview: "", word_count: 0, task_done: 0, task_total: 0, tags: "[]", created_at: "2026-04-11T10:00:00Z", updated_at: "2026-04-11T12:00:00Z" }];
    render(<Sidebar {...baseProps} notes={untitled} activeNoteId={null} />);
    expect(screen.getByText("Untitled")).toBeTruthy();
  });
});
