import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { MarkdownEditor } from "./MarkdownEditor";
import { RichTextEditor } from "./RichTextEditor";
import { RichTextPreview } from "./RichTextPreview";
import { attachmentMarkdown } from "./AttachmentNode";
import { uploadAttachment } from "../lib/api";
import { queryKeys } from "../lib/queries";
import type { EditorMode } from "../types";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  mode: EditorMode;
  noteId?: string;
  copyMarkdownByDefault?: boolean;
  smartTypography?: boolean;
}

export function Editor({
  content,
  onChange,
  mode,
  noteId = "",
  copyMarkdownByDefault = false,
  smartTypography = true,
}: EditorProps) {
  const [editorRevision, setEditorRevision] = useState(0);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  async function attachFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.size > 0);
    if (list.length === 0 || uploading || !noteId) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of list) {
        uploaded.push(await uploadAttachment(noteId, file));
      }
      const insertion = uploaded
        .map((attachment) =>
          attachmentMarkdown({
            id: attachment.id,
            filename: attachment.filename,
            contentType: attachment.content_type,
            size: attachment.size,
          }),
        )
        .join("\n\n");
      const prefix = contentRef.current.trimEnd();
      const next = `${prefix}${prefix ? "\n\n" : ""}${insertion}\n`;
      contentRef.current = next;
      onChange(next);
      qc.invalidateQueries({ queryKey: queryKeys.attachments(noteId) });
      setEditorRevision((value) => value + 1);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    const files = event.clipboardData?.files;
    if (!files || files.length === 0) return;
    event.preventDefault();
    void attachFiles(files);
  }

  function handleDrop(event: React.DragEvent) {
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    event.preventDefault();
    void attachFiles(files);
  }

  const attachButton = (
    <div className="fixed right-3 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-10 sm:right-4 sm:bottom-14">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) =>
          event.currentTarget.files && void attachFiles(event.currentTarget.files)
        }
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Attach files"
        className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-secondary/80 text-text-muted shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:cursor-wait disabled:opacity-60"
      >
        <Paperclip size={15} />
      </button>
    </div>
  );

  if (mode === "split") {
    return (
      <div
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        className="flex min-h-full w-full max-w-[1200px] flex-col px-4 pt-16 pb-32 animate-[fade-in_0.2s_ease-out] sm:pt-10 sm:pb-24"
      >
        {attachButton}
        <div className="flex flex-1 flex-col gap-8 md:flex-row md:gap-6">
          <div className="flex-1 min-w-0">
            <MarkdownEditor
              key={`markdown-${editorRevision}`}
              initialContent={contentRef.current}
              onChange={onChange}
            />
          </div>
          <div className="h-px bg-border md:h-auto md:w-px shrink-0" />
          <div className="flex-1 min-w-0">
            <RichTextPreview content={contentRef.current} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
      className="flex min-h-full w-full max-w-[680px] flex-col px-4 pt-16 pb-32 animate-[fade-in_0.2s_ease-out] sm:px-6 sm:pt-10 sm:pb-24"
    >
      {attachButton}
      <div className="flex-1">
        {mode === "markdown" ? (
          <MarkdownEditor
            key={`markdown-${editorRevision}`}
            initialContent={contentRef.current}
            onChange={onChange}
          />
        ) : (
          <RichTextEditor
            key={`rich-${editorRevision}`}
            initialContent={contentRef.current}
            onChange={onChange}
            copyMarkdownByDefault={copyMarkdownByDefault}
            smartTypography={smartTypography}
          />
        )}
      </div>
    </div>
  );
}
