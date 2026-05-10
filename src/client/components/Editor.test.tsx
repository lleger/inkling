import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render as rtlRender, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { Editor } from "./Editor";
import { makeQueryWrapper } from "../hooks/test-utils";
import type { EditorMode } from "../types";

afterEach(cleanup);

function render(ui: React.ReactElement) {
  const { Wrapper } = makeQueryWrapper();
  return rtlRender(ui, { wrapper: Wrapper });
}

const baseProps = {
  content: "",
  onChange: vi.fn(),
};

describe("Editor", () => {
  it("renders rich text editor in richtext mode", () => {
    const { container } = render(<Editor {...baseProps} mode="richtext" />);
    expect(container.querySelector(".editor-rich")).toBeTruthy();
    expect(container.querySelector(".editor-mono")).toBeNull();
  });

  it("renders markdown editor in markdown mode", () => {
    const { container } = render(<Editor {...baseProps} mode="markdown" />);
    expect(container.querySelector(".editor-mono")).toBeTruthy();
    expect(container.querySelector(".editor-rich")).toBeNull();
  });

  it("renders both editors in split mode", () => {
    const { container } = render(<Editor {...baseProps} mode="split" />);
    expect(container.querySelector(".editor-mono")).toBeTruthy();
    expect(container.querySelector(".editor-rich")).toBeTruthy();
  });

  it("uses wider max-width in split mode", () => {
    const { container } = render(<Editor {...baseProps} mode="split" />);
    expect(container.firstElementChild!.className).toContain("max-w-[1200px]");
  });

  it("uses narrow max-width in single modes", () => {
    const { container } = render(<Editor {...baseProps} mode="richtext" />);
    expect(container.firstElementChild!.className).toContain("max-w-[680px]");
  });

  it("rich text side in split mode is not editable", () => {
    const { container } = render(<Editor {...baseProps} mode="split" />);
    const richInput = container.querySelector(".editor-rich [contenteditable]");
    expect(richInput?.getAttribute("contenteditable")).toBe("false");
  });

  it("preserves controlled content while switching editor modes", async () => {
    function ModeHarness() {
      const [mode, setMode] = useState<EditorMode>("markdown");
      const [content, setContent] = useState("# Fast Flow\n\n- item one");

      return (
        <>
          <button onClick={() => setMode("markdown")}>Markdown</button>
          <button onClick={() => setMode("split")}>Split</button>
          <button onClick={() => setMode("richtext")}>Rich Text</button>
          <Editor content={content} onChange={setContent} mode={mode} />
        </>
      );
    }

    const { container } = render(<ModeHarness />);

    await waitFor(() => {
      expect(container.querySelector(".editor-mono")?.textContent).toContain("# Fast Flow");
    });

    fireEvent.click(screen.getByText("Split"));
    await waitFor(() => {
      expect(container.querySelector(".editor-mono")?.textContent).toContain("# Fast Flow");
      expect(container.querySelector(".editor-heading-h1")?.textContent).toBe("Fast Flow");
      expect(container.querySelector(".editor-listitem")?.textContent).toBe("item one");
    });

    fireEvent.click(screen.getByText("Rich Text"));
    await waitFor(() => {
      expect(container.querySelector(".editor-mono")).toBeNull();
      expect(container.querySelector(".editor-heading-h1")?.textContent).toBe("Fast Flow");
      expect(container.querySelector(".editor-listitem")?.textContent).toBe("item one");
    });
  });
});
