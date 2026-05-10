import { MarkdownEditor } from "./MarkdownEditor";
import { RichTextEditor } from "./RichTextEditor";
import { RichTextPreview } from "./RichTextPreview";
import type { EditorMode } from "../types";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  mode: EditorMode;
  smartTypography?: boolean;
}

export function Editor({ content, onChange, mode, smartTypography = true }: EditorProps) {
  if (mode === "split") {
    return (
      <div className="flex min-h-full w-full max-w-[1200px] flex-col px-4 pt-16 pb-32 animate-[fade-in_0.2s_ease-out] sm:pt-10 sm:pb-24">
        <div className="flex flex-1 flex-col gap-8 md:flex-row md:gap-6">
          <div className="flex-1 min-w-0">
            <MarkdownEditor initialContent={content} onChange={onChange} />
          </div>
          <div className="h-px bg-border md:h-auto md:w-px shrink-0" />
          <div className="flex-1 min-w-0">
            <RichTextPreview content={content} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full max-w-[680px] flex-col px-4 pt-16 pb-32 animate-[fade-in_0.2s_ease-out] sm:px-6 sm:pt-10 sm:pb-24">
      <div className="flex-1">
        {mode === "markdown" ? (
          <MarkdownEditor initialContent={content} onChange={onChange} />
        ) : (
          <RichTextEditor
            initialContent={content}
            onChange={onChange}
            smartTypography={smartTypography}
          />
        )}
      </div>
    </div>
  );
}
