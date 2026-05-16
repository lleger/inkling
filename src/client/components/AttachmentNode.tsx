import { DecoratorNode, type EditorConfig, type LexicalNode, type NodeKey } from "lexical";
import { FileText, Download } from "lucide-react";

export interface AttachmentPayload {
  id: string;
  filename: string;
  contentType: string;
  size?: number;
}

interface SerializedAttachmentNode {
  type: "attachment";
  version: 1;
  id: string;
  filename: string;
  contentType: string;
  size?: number;
}

export class AttachmentNode extends DecoratorNode<React.ReactNode> {
  __id: string;
  __filename: string;
  __contentType: string;
  __size?: number;

  static getType(): string {
    return "attachment";
  }

  static clone(node: AttachmentNode): AttachmentNode {
    return new AttachmentNode(
      node.__id,
      node.__filename,
      node.__contentType,
      node.__size,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedAttachmentNode): AttachmentNode {
    return $createAttachmentNode(serializedNode);
  }

  constructor(id: string, filename: string, contentType: string, size?: number, key?: NodeKey) {
    super(key);
    this.__id = id;
    this.__filename = filename;
    this.__contentType = contentType;
    this.__size = size;
  }

  exportJSON(): SerializedAttachmentNode {
    return {
      type: "attachment",
      version: 1,
      id: this.__id,
      filename: this.__filename,
      contentType: this.__contentType,
      size: this.__size,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement("span");
    element.className = "editor-attachment-shell";
    return element;
  }

  updateDOM(): false {
    return false;
  }

  getTextContent(): string {
    return this.__filename;
  }

  getPayload(): AttachmentPayload {
    return {
      id: this.__id,
      filename: this.__filename,
      contentType: this.__contentType,
      size: this.__size,
    };
  }

  decorate(): React.ReactNode {
    return <AttachmentView attachment={this.getPayload()} />;
  }
}

export function $createAttachmentNode(payload: AttachmentPayload): AttachmentNode {
  return new AttachmentNode(payload.id, payload.filename, payload.contentType, payload.size);
}

export function $isAttachmentNode(node: LexicalNode | null | undefined): node is AttachmentNode {
  return node instanceof AttachmentNode;
}

export function attachmentMarkdown(payload: AttachmentPayload): string {
  const text = escapeMarkdownLabel(payload.filename || "attachment");
  const url = `/api/attachments/${payload.id}/content`;
  return payload.contentType.startsWith("image/") ? `![${text}](${url})` : `[${text}](${url})`;
}

function AttachmentView({ attachment }: { attachment: AttachmentPayload }) {
  const href = `/api/attachments/${attachment.id}/content`;
  if (attachment.contentType.startsWith("image/")) {
    return (
      <a className="editor-attachment-image-link" href={href} target="_blank" rel="noreferrer">
        <img className="editor-attachment-image" src={href} alt={attachment.filename} />
      </a>
    );
  }

  return (
    <a className="editor-attachment-card" href={href} target="_blank" rel="noreferrer">
      <span className="editor-attachment-icon">
        <FileText size={16} />
      </span>
      <span className="editor-attachment-meta">
        <span className="editor-attachment-name">{attachment.filename}</span>
        {attachment.size !== undefined && (
          <span className="editor-attachment-size">{formatBytes(attachment.size)}</span>
        )}
      </span>
      <Download className="editor-attachment-download" size={14} />
    </a>
  );
}

function escapeMarkdownLabel(value: string): string {
  return value.replace(/]/g, "\\]");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
