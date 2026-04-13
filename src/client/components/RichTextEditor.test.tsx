import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { RichTextEditor } from "./RichTextEditor";
import { RichTextPreview } from "./RichTextPreview";

afterEach(cleanup);

describe("RichTextEditor", () => {
  it("renders with editor-rich class", () => {
    const { container } = render(<RichTextEditor initialContent="" onChange={vi.fn()} />);
    expect(container.querySelector(".editor-rich")).toBeTruthy();
  });

  it("renders contenteditable element", () => {
    const { container } = render(<RichTextEditor initialContent="" onChange={vi.fn()} />);
    const editable = container.querySelector("[contenteditable]");
    expect(editable).toBeTruthy();
    expect(editable?.getAttribute("contenteditable")).toBe("true");
  });

  it("renders heading from markdown", async () => {
    const { container } = render(<RichTextEditor initialContent="# Hello" onChange={vi.fn()} />);
    await waitFor(() => {
      const h1 = container.querySelector(".editor-heading-h1");
      expect(h1).toBeTruthy();
      expect(h1?.textContent).toBe("Hello");
    });
  });

  it("renders list items from markdown", async () => {
    const { container } = render(
      <RichTextEditor initialContent={"- item one\n- item two"} onChange={vi.fn()} />,
    );
    await waitFor(() => {
      const items = container.querySelectorAll(".editor-listitem");
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("shows placeholder when empty", () => {
    const { container } = render(<RichTextEditor initialContent="" onChange={vi.fn()} />);
    expect(container.querySelector(".editor-placeholder")).toBeTruthy();
  });

  it("respects autoFocus=false", () => {
    const { container } = render(
      <RichTextEditor initialContent="" onChange={vi.fn()} autoFocus={false} />,
    );
    expect(container.querySelector(".editor-rich")).toBeTruthy();
  });
});

describe("RichTextPreview", () => {
  it("renders as read-only", () => {
    const { container } = render(<RichTextPreview content="" />);
    const editable = container.querySelector("[contenteditable]");
    expect(editable?.getAttribute("contenteditable")).toBe("false");
  });

  it("renders heading from markdown", async () => {
    const { container } = render(<RichTextPreview content="# Preview Title" />);
    await waitFor(() => {
      const h1 = container.querySelector(".editor-heading-h1");
      expect(h1).toBeTruthy();
      expect(h1?.textContent).toBe("Preview Title");
    });
  });

  it("updates when content prop changes", async () => {
    const { container, rerender } = render(<RichTextPreview content="# First" />);
    await waitFor(() => {
      expect(container.querySelector(".editor-heading-h1")?.textContent).toBe("First");
    });

    rerender(<RichTextPreview content="# Second" />);
    await waitFor(() => {
      expect(container.querySelector(".editor-heading-h1")?.textContent).toBe("Second");
    });
  });

  it("renders list items", async () => {
    const { container } = render(<RichTextPreview content={"- a\n- b\n- c"} />);
    await waitFor(() => {
      const items = container.querySelectorAll(".editor-listitem");
      expect(items.length).toBe(3);
    });
  });
});
