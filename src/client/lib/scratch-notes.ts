import { dailyTitle } from "./daily-notes";
import type { NoteMeta } from "../types";

export const SCRATCH_NOTE_TITLE = "Scratch";
export const SCRATCH_NOTE_FOLDER = "Scratch";
export const DEFAULT_SCRATCH_NOTE_TEMPLATE = "# Scratch\n\n";

export function scratchTitle(): string {
  return SCRATCH_NOTE_TITLE;
}

export function scratchFolder(): string {
  return SCRATCH_NOTE_FOLDER;
}

export function isScratchNote(note: NoteMeta): boolean {
  return note.folder === SCRATCH_NOTE_FOLDER;
}

export function findScratchNote(notes: NoteMeta[]): NoteMeta | undefined {
  return (
    notes.find(
      (note) => note.title === SCRATCH_NOTE_TITLE && note.folder === SCRATCH_NOTE_FOLDER,
    ) ?? notes.find(isScratchNote)
  );
}

export function renderScratchNoteTemplate(): string {
  return DEFAULT_SCRATCH_NOTE_TEMPLATE;
}

export function shouldResetScratchNote(updatedAt: string, base: Date = new Date()): boolean {
  return dailyTitle(new Date(updatedAt)) < dailyTitle(base);
}
