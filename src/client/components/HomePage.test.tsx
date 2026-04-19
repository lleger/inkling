import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HomePage } from "./HomePage";

afterEach(cleanup);

const notes = [
  { id: "1", title: "First Note", preview: "Some preview text", word_count: 150, task_done: 2, task_total: 5, tags: '["project"]', pinned: 0, folder: null, created_at: "2026-04-11T10:00:00Z", updated_at: "2026-04-11T12:00:00Z" },
  { id: "2", title: "Second Note", preview: "Another preview", word_count: 80, task_done: 0, task_total: 0, tags: "[]", pinned: 0, folder: null, created_at: "2026-04-11T09:00:00Z", updated_at: "2026-04-11T11:00:00Z" },
];

const baseProps = {
  onSelectNote: vi.fn(),
  onCreateNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onImportFiles: vi.fn(),
  allTags: ["project"],
  selectedTag: null,
  onSelectTag: vi.fn(),
};

describe("HomePage", () => {
  it("renders note cards", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    expect(screen.getByText("First Note")).toBeTruthy();
    expect(screen.getByText("Second Note")).toBeTruthy();
  });

  it("shows preview text on cards", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    expect(screen.getByText("Some preview text")).toBeTruthy();
  });

  it("shows summary stats", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    expect(screen.getByText("2 notes")).toBeTruthy();
    expect(screen.getByText("230 words")).toBeTruthy();
    expect(screen.getAllByText("2/5 tasks").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onSelectNote when clicking a note card", () => {
    const onSelect = vi.fn();
    render(<HomePage {...baseProps} notes={notes} onSelectNote={onSelect} />);
    fireEvent.click(screen.getByText("First Note"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("calls onCreateNote when clicking new note", () => {
    const onCreate = vi.fn();
    render(<HomePage {...baseProps} notes={notes} onCreateNote={onCreate} />);
    fireEvent.click(screen.getByText("New Note"));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("filters notes client-side by title", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes..."), { target: { value: "First" } });
    expect(screen.getByText("First Note")).toBeTruthy();
    expect(screen.queryByText("Second Note")).toBeNull();
  });

  it("filters notes client-side by preview", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes..."), { target: { value: "Another" } });
    expect(screen.queryByText("First Note")).toBeNull();
    expect(screen.getByText("Second Note")).toBeTruthy();
  });

  it("shows clear button when searching with no results", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes..."), { target: { value: "nonexistent" } });
    expect(screen.getByText("Clear search")).toBeTruthy();
  });

  it("clears search and shows all notes", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    const input = screen.getByPlaceholderText("Search notes...");
    fireEvent.change(input, { target: { value: "First" } });
    expect(screen.queryByText("Second Note")).toBeNull();

    // Clear via the X button in the input
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText("First Note")).toBeTruthy();
    expect(screen.getByText("Second Note")).toBeTruthy();
  });

  it("shows no results state with clear link", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes..."), { target: { value: "xyz" } });
    expect(screen.getByText("Clear search")).toBeTruthy();
  });

  it("shows empty state when no notes exist", () => {
    render(<HomePage {...baseProps} notes={[]} />);
    expect(screen.getByText("No notes yet")).toBeTruthy();
  });

  it("hides new note card when searching", () => {
    render(<HomePage {...baseProps} notes={notes} />);
    expect(screen.getByText("New Note")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Search notes..."), { target: { value: "First" } });
    expect(screen.queryByText("New Note")).toBeNull();
  });
});
