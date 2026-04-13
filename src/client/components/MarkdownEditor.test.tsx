import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

afterEach(cleanup);

describe("MarkdownEditor", () => {
  it("renders with editor-mono class", () => {
    const { container } = render(<MarkdownEditor initialContent="" onChange={vi.fn()} />);
    expect(container.querySelector(".editor-mono")).toBeTruthy();
  });

  it("renders contenteditable element", () => {
    const { container } = render(<MarkdownEditor initialContent="" onChange={vi.fn()} />);
    const editable = container.querySelector("[contenteditable]");
    expect(editable).toBeTruthy();
    expect(editable?.getAttribute("contenteditable")).toBe("true");
  });

  it("renders initial content as plain text", async () => {
    const { container } = render(
      <MarkdownEditor initialContent="# Hello World" onChange={vi.fn()} />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("# Hello World");
    });
    // In markdown mode, headings are plain text, not rendered as <h1>
    expect(container.querySelector(".editor-heading-h1")).toBeNull();
  });

  it("shows placeholder when empty", () => {
    const { container } = render(<MarkdownEditor initialContent="" onChange={vi.fn()} />);
    expect(container.querySelector(".editor-placeholder")).toBeTruthy();
  });

  it("respects autoFocus=false", () => {
    const { container } = render(
      <MarkdownEditor initialContent="" onChange={vi.fn()} autoFocus={false} />,
    );
    expect(container.querySelector(".editor-mono")).toBeTruthy();
  });

  it("renders multiple lines as separate paragraphs", async () => {
    const { container } = render(
      <MarkdownEditor initialContent={"line one\nline two\nline three"} onChange={vi.fn()} />,
    );
    await waitFor(() => {
      const paragraphs = container.querySelectorAll(".editor-paragraph-mono");
      expect(paragraphs.length).toBe(3);
    });
  });
});
