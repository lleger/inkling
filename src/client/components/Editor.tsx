import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, FileUp, LoaderCircle, Paperclip, X } from "lucide-react";
import { MarkdownEditor } from "./MarkdownEditor";
import { RichTextEditor } from "./RichTextEditor";
import { RichTextPreview } from "./RichTextPreview";
import { attachmentMarkdown, formatBytes } from "./AttachmentNode";
import { emitToast } from "../context/UIContext";
import { uploadAttachment } from "../lib/api";
import { queryKeys } from "../lib/queries";
import type { EditorMode } from "../types";

type PendingUpload = {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "failed";
};

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
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef(content);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  async function attachFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.size > 0);
    if (list.length === 0 || uploading || !noteId) return;

    const uploadItems = list.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      name: file.name || "attachment",
      size: file.size,
      status: "uploading" as const,
    }));

    setUploading(true);
    setPendingUploads(uploadItems);
    try {
      const uploaded = [];
      let failed = 0;
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const itemId = uploadItems[i].id;
        try {
          uploaded.push(await uploadAttachment(noteId, file));
          setPendingUploads((items) =>
            items.map((item) => (item.id === itemId ? { ...item, status: "done" } : item)),
          );
        } catch {
          setPendingUploads((items) =>
            items.map((item) => (item.id === itemId ? { ...item, status: "failed" } : item)),
          );
          failed++;
        }
      }
      if (failed > 0) {
        emitToast({
          message: `${failed} ${failed === 1 ? "attachment" : "attachments"} failed to upload.`,
        });
      }
      if (uploaded.length === 0) return;
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
      if (failed === 0) window.setTimeout(() => setPendingUploads([]), 1200);
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

  function handleDragEnter(event: React.DragEvent) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current++;
    setDraggingFiles(true);
  }

  function handleDragOver(event: React.DragEvent) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = noteId && !uploading ? "copy" : "none";
  }

  function handleDragLeave(event: React.DragEvent) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDraggingFiles(false);
  }

  function handleDrop(event: React.DragEvent) {
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setDraggingFiles(false);
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
        className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-secondary/80 text-text-muted shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:cursor-wait disabled:text-accent"
      >
        {uploading ? <LoaderCircle size={15} className="animate-spin" /> : <Paperclip size={15} />}
      </button>
    </div>
  );

  const dropZone = draggingFiles && (
    <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-accent/10 text-accent backdrop-blur-[2px] motion-drop-target-in sm:inset-6">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-accent/20 bg-surface/90 px-5 py-4 shadow-lg">
        <FileUp size={24} strokeWidth={1.75} />
        <div className="text-sm font-semibold">Drop files to attach</div>
        <div className="text-xs text-text-muted">
          They will upload and be inserted into this note.
        </div>
      </div>
    </div>
  );

  const uploadTray = pendingUploads.length > 0 && (
    <div className="fixed right-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 flex w-[min(calc(100vw-1.5rem),20rem)] flex-col gap-1.5 rounded-xl border border-border bg-surface-secondary/95 p-2 text-xs text-text shadow-lg backdrop-blur-sm sm:right-4 sm:bottom-24 motion-pop-in">
      <div className="flex items-center gap-1.5 px-1 pb-0.5 font-medium text-text-secondary">
        <FileUp size={13} />
        Uploading attachments
      </div>
      {pendingUploads.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5">
          <UploadStatusIcon status={item.status} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-text">{item.name}</div>
            <div className="text-[11px] text-text-muted">{formatBytes(item.size)}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const editorEvents = {
    onPaste: handlePaste,
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  if (mode === "split") {
    return (
      <div
        {...editorEvents}
        className="relative flex min-h-full w-full max-w-[1200px] flex-col px-4 pt-16 pb-32 animate-[fade-in_0.2s_ease-out] sm:pt-10 sm:pb-24"
      >
        {dropZone}
        {uploadTray}
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
      {...editorEvents}
      className="relative flex min-h-full w-full max-w-[680px] flex-col px-4 pt-16 pb-32 animate-[fade-in_0.2s_ease-out] sm:px-6 sm:pt-10 sm:pb-24"
    >
      {dropZone}
      {uploadTray}
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

function hasDraggedFiles(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function UploadStatusIcon({ status }: { status: PendingUpload["status"] }) {
  if (status === "done") return <Check size={14} className="shrink-0 text-accent" />;
  if (status === "failed") return <X size={14} className="shrink-0 text-red-500" />;
  return <LoaderCircle size={14} className="shrink-0 animate-spin text-accent" />;
}
