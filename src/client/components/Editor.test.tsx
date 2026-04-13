import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Editor } from "./Editor";

afterEach(cleanup);

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
});
