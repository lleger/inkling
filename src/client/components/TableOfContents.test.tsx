import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TableOfContentsDrawer } from "./TableOfContents";
import type { TocHeading } from "../lib/table-of-contents";

afterEach(cleanup);

const headings: TocHeading[] = [
  { id: "intro", level: 1, text: "Intro", line: 1, occurrence: 1 },
  { id: "setup", level: 2, text: "Setup", line: 3, occurrence: 1 },
];

describe("TableOfContentsDrawer", () => {
  it("renders heading links", () => {
    render(
      <TableOfContentsDrawer
        headings={headings}
        activeHeadingId={null}
        onSelect={vi.fn()}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Outline")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Intro" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Setup" })).toBeTruthy();
  });

  it("selects a heading", () => {
    const onSelect = vi.fn();
    render(
      <TableOfContentsDrawer
        headings={headings}
        activeHeadingId={null}
        onSelect={onSelect}
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Setup" }));

    expect(onSelect).toHaveBeenCalledWith(headings[1]);
  });

  it("renders an empty state without headings", () => {
    render(
      <TableOfContentsDrawer
        headings={[]}
        activeHeadingId={null}
        onSelect={vi.fn()}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Add headings to build an outline.")).toBeTruthy();
  });
});
