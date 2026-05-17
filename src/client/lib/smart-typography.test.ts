import { describe, it, expect } from "vitest";
import { getSmartReplacement } from "./smart-typography";

describe("getSmartReplacement", () => {
  describe("em-dash", () => {
    it("converts -- to em-dash", () => {
      const r = getSmartReplacement("-", "-", "");
      expect(r).toEqual({ char: "\u2014", deleteCount: 1 });
    });

    it("does not replace single -", () => {
      const r = getSmartReplacement("-", " ", "");
      expect(r).toBeNull();
    });

    it("does not replace - at start of text", () => {
      const r = getSmartReplacement("-", "", "");
      expect(r).toBeNull();
    });
  });

  describe("smart double quotes", () => {
    it("opening quote at start of text", () => {
      const r = getSmartReplacement('"', "", "");
      expect(r).toEqual({ char: "\u201C", deleteCount: 0 });
    });

    it("opening quote after space", () => {
      const r = getSmartReplacement('"', " ", "");
      expect(r).toEqual({ char: "\u201C", deleteCount: 0 });
    });

    it("opening quote after (", () => {
      const r = getSmartReplacement('"', "(", "");
      expect(r).toEqual({ char: "\u201C", deleteCount: 0 });
    });

    it("closing quote after word character", () => {
      const r = getSmartReplacement('"', "d", "");
      expect(r).toEqual({ char: "\u201D", deleteCount: 0 });
    });

    it("closing quote after punctuation", () => {
      const r = getSmartReplacement('"', ".", "");
      expect(r).toEqual({ char: "\u201D", deleteCount: 0 });
    });
  });

  describe("smart single quotes", () => {
    it("opening quote at start of text", () => {
      const r = getSmartReplacement("'", "", "");
      expect(r).toEqual({ char: "\u2018", deleteCount: 0 });
    });

    it("opening quote after space", () => {
      const r = getSmartReplacement("'", " ", "");
      expect(r).toEqual({ char: "\u2018", deleteCount: 0 });
    });

    it("apostrophe after letter (don't)", () => {
      const r = getSmartReplacement("'", "n", "");
      expect(r).toEqual({ char: "\u2019", deleteCount: 0 });
    });

    it("closing quote after punctuation", () => {
      const r = getSmartReplacement("'", ".", "");
      expect(r).toEqual({ char: "\u2019", deleteCount: 0 });
    });
  });

  describe("ellipsis", () => {
    it("converts ... to ellipsis", () => {
      const r = getSmartReplacement(".", ".", "..");
      expect(r).toEqual({ char: "\u2026", deleteCount: 2 });
    });

    it("does not convert single .", () => {
      const r = getSmartReplacement(".", " ", "");
      expect(r).toBeNull();
    });

    it("does not convert ..", () => {
      const r = getSmartReplacement(".", ".", " .");
      expect(r).toBeNull();
    });
  });

  describe("emoji", () => {
    it("converts smile emoticons", () => {
      const r = getSmartReplacement(")", ":", " :", "hello :");
      expect(r).toEqual({ char: "🙂", deleteCount: 1 });
    });

    it("converts skeptical emoticons", () => {
      const r = getSmartReplacement("/", ":", " :", "hello :");
      expect(r).toEqual({ char: "😕", deleteCount: 1 });
    });

    it("does not convert emoticons inside URL schemes", () => {
      const r = getSmartReplacement("/", ":", "p:", "http:");
      expect(r).toBeNull();
    });

    it("converts GitHub and Slack-style emoji shortcuts", () => {
      const r = getSmartReplacement(":", "1", "+1", ":+1");
      expect(r).toEqual({ char: "👍🏻", deleteCount: 3 });
    });

    it("converts named emoji shortcuts", () => {
      const r = getSmartReplacement(":", "e", "le", "ship it :tada");
      expect(r).toEqual({ char: "🎉", deleteCount: 5 });
    });

    it("ignores unknown emoji shortcuts", () => {
      const r = getSmartReplacement(":", "n", "wn", ":unknown");
      expect(r).toBeNull();
    });
  });

  describe("no replacement", () => {
    it("returns null for regular characters", () => {
      expect(getSmartReplacement("a", " ", "")).toBeNull();
      expect(getSmartReplacement("1", "x", "")).toBeNull();
      expect(getSmartReplacement("Enter", "", "")).toBeNull();
    });
  });
});
