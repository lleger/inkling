import { describe, it, expect } from "vitest";
import { clearDoneTasks } from "./clear-done-tasks";

describe("clearDoneTasks", () => {
  it("removes checked items and keeps unchecked", () => {
    const input = "- [x] done\n- [ ] todo\n- [x] also done";
    expect(clearDoneTasks(input)).toBe("- [ ] todo");
  });

  it("is case insensitive", () => {
    const input = "- [X] Done\n- [ ] todo";
    expect(clearDoneTasks(input)).toBe("- [ ] todo");
  });

  it("removes nested sub-items under checked parent", () => {
    const input = "- [x] parent\n  - child one\n  - child two\n- [ ] kept";
    expect(clearDoneTasks(input)).toBe("- [ ] kept");
  });

  it("keeps nested sub-items under unchecked parent", () => {
    const input = "- [ ] parent\n  - child one\n  - child two";
    expect(clearDoneTasks(input)).toBe("- [ ] parent\n  - child one\n  - child two");
  });

  it("handles mixed list", () => {
    const input = "- [ ] first\n- [x] second\n- [ ] third\n- [x] fourth";
    expect(clearDoneTasks(input)).toBe("- [ ] first\n- [ ] third");
  });

  it("preserves content around checklists", () => {
    const input = "# Title\n\nSome text.\n\n- [x] done\n- [ ] todo\n\nMore text.";
    expect(clearDoneTasks(input)).toBe("# Title\n\nSome text.\n\n- [ ] todo\n\nMore text.");
  });

  it("returns input unchanged when no done tasks", () => {
    const input = "- [ ] one\n- [ ] two";
    expect(clearDoneTasks(input)).toBe("- [ ] one\n- [ ] two");
  });

  it("handles all items checked", () => {
    const input = "# Title\n\n- [x] one\n- [x] two";
    expect(clearDoneTasks(input)).toBe("# Title");
  });

  it("handles empty string", () => {
    expect(clearDoneTasks("")).toBe("");
  });

  it("handles multiple separate checklists", () => {
    const input = "## Section A\n\n- [x] a done\n- [ ] a todo\n\n## Section B\n\n- [ ] b todo\n- [x] b done";
    expect(clearDoneTasks(input)).toBe("## Section A\n\n- [ ] a todo\n\n## Section B\n\n- [ ] b todo");
  });

  it("preserves heading and tag zone", () => {
    const input = "# My Note\n#project #draft\n\n- [x] done\n- [ ] todo";
    expect(clearDoneTasks(input)).toBe("# My Note\n#project #draft\n\n- [ ] todo");
  });
});
