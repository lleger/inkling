import type { SaveStatus } from "../types";

type SaveStatusMeta = {
  label: string;
  shortLabel: string;
  textClassName: string;
  dotClassName: string;
};

const metaByStatus: Record<SaveStatus, SaveStatusMeta> = {
  saved: {
    label: "Saved",
    shortLabel: "Saved",
    textClassName: "text-text-muted",
    dotClassName: "bg-text-muted/60",
  },
  saving: {
    label: "Saving...",
    shortLabel: "Saving...",
    textClassName: "text-accent",
    dotClassName: "bg-accent animate-pulse",
  },
  unsaved: {
    label: "Unsaved changes",
    shortLabel: "Unsaved",
    textClassName: "text-accent",
    dotClassName: "bg-text-muted animate-pulse",
  },
  failed: {
    label: "Save failed",
    shortLabel: "Save failed",
    textClassName: "text-red-500",
    dotClassName: "bg-red-500",
  },
};

export function saveStatusMeta(status: SaveStatus): SaveStatusMeta {
  return metaByStatus[status];
}
