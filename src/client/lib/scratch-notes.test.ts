import { describe, it, expect } from "vitest";
import {
  findScratchNote,
  isScratchNote,
  renderScratchNoteTemplate,
  scratchFolder,
  scratchTitle,
  shouldResetScratchNote,
} from "./scratch-notes";
import type { NoteMeta } from "../types";

const note = (overrides: Partial<NoteMeta>): NoteMeta => ({
  id: "note",
  title: "Note",
  preview: "",
  word_count: 0,
  task_done: 0,
  task_total: 0,
  tags: "[]",
  pinned: 0,
  folder: null,
  created_at: "2026-05-10T10:00:00Z",
  updated_at: "2026-05-10T10:00:00Z",
  ...overrides,
});

describe("scratch notes", () => {
  it("uses a reserved title and folder", () => {
    expect(scratchTitle()).toBe("Scratch");
    expect(scratchFolder()).toBe("Scratch");
  });

  it("matches scratch notes by reserved folder", () => {
    expect(isScratchNote(note({ title: "Changed", folder: "Scratch" }))).toBe(true);
    expect(isScratchNote(note({ title: "Scratch", folder: null }))).toBe(false);
  });

  it("prefers the canonical scratch note when finding one", () => {
    const renamed = note({ id: "renamed", title: "Changed", folder: "Scratch" });
    const canonical = note({ id: "scratch", title: "Scratch", folder: "Scratch" });

    expect(findScratchNote([renamed, canonical])?.id).toBe("scratch");
  });

  it("renders the default template", () => {
    expect(renderScratchNoteTemplate()).toBe("# Scratch\n\n");
  });

  it("resets only when the note was last updated before the current local day", () => {
    const base = new Date(2026, 4, 10, 12);

    expect(shouldResetScratchNote(new Date(2026, 4, 9, 23).toISOString(), base)).toBe(true);
    expect(shouldResetScratchNote(new Date(2026, 4, 10, 0).toISOString(), base)).toBe(false);
  });
});
