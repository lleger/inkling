import {
  Archive,
  BookOpen,
  Briefcase,
  CalendarDays,
  Code,
  Folder,
  FolderOpen,
  Heart,
  Home,
  Inbox,
  Lightbulb,
  ListChecks,
  Music,
  Palette,
  Plane,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { FolderMetadata } from "../types";

export const LUCIDE_FOLDER_ICONS: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: "archive", label: "Archive", Icon: Archive },
  { name: "book-open", label: "Book", Icon: BookOpen },
  { name: "briefcase", label: "Work", Icon: Briefcase },
  { name: "calendar-days", label: "Calendar", Icon: CalendarDays },
  { name: "code", label: "Code", Icon: Code },
  { name: "heart", label: "Heart", Icon: Heart },
  { name: "home", label: "Home", Icon: Home },
  { name: "inbox", label: "Inbox", Icon: Inbox },
  { name: "lightbulb", label: "Idea", Icon: Lightbulb },
  { name: "list-checks", label: "Tasks", Icon: ListChecks },
  { name: "music", label: "Music", Icon: Music },
  { name: "palette", label: "Creative", Icon: Palette },
  { name: "plane", label: "Travel", Icon: Plane },
  { name: "star", label: "Star", Icon: Star },
];

export const COMMON_FOLDER_EMOJIS = [
  "📁",
  "🏠",
  "💼",
  "📚",
  "💡",
  "✅",
  "⭐",
  "❤️",
  "🎨",
  "🎵",
  "✈️",
  "📥",
];

export function renderFolderIcon(
  metadata: FolderMetadata | undefined,
  isExpanded: boolean,
  size = 13,
  className = "shrink-0",
) {
  if (metadata?.icon_type === "emoji") {
    return (
      <span
        className={`${className} inline-flex items-center justify-center`}
        style={{ fontSize: size }}
      >
        {metadata.icon_value}
      </span>
    );
  }

  if (metadata?.icon_type === "lucide") {
    const match = LUCIDE_FOLDER_ICONS.find((icon) => icon.name === metadata.icon_value);
    if (match) return <match.Icon size={size} className={className} />;
  }

  return isExpanded ? (
    <FolderOpen size={size} className={className} />
  ) : (
    <Folder size={size} className={className} />
  );
}
