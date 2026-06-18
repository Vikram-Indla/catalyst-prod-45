import { describe, it, expect } from "vitest";
import { ghostReducer, type GhostState } from "../ghostState";

const opened: GhostState = ghostReducer(
  { input: "", ghost: null, dismissed: false },
  { type: "open", ghost: "Show open bugs" },
);

describe("ghostReducer", () => {
  it("open sets the ghost and leaves input empty", () => {
    expect(opened).toEqual({ input: "", ghost: "Show open bugs", dismissed: false });
  });

  it("typing clears the ghost and stores the user input", () => {
    const s = ghostReducer(opened, { type: "change", value: "my bugs" });
    expect(s.input).toBe("my bugs");
    expect(s.ghost).toBeNull();
    expect(s.dismissed).toBe(true);
  });

  it("acceptGhost promotes the ghost to input and clears the ghost", () => {
    const s = ghostReducer(opened, { type: "acceptGhost" });
    expect(s.input).toBe("Show open bugs");
    expect(s.ghost).toBeNull();
  });

  it("acceptGhost is a no-op when there is no ghost", () => {
    const base: GhostState = { input: "abc", ghost: null, dismissed: true };
    expect(ghostReducer(base, { type: "acceptGhost" })).toEqual(base);
  });

  it("once dismissed, clearing input back to empty does not revive the ghost", () => {
    const typed = ghostReducer(opened, { type: "change", value: "x" });
    const cleared = ghostReducer(typed, { type: "change", value: "" });
    expect(cleared.input).toBe("");
    expect(cleared.ghost).toBeNull();
  });

  it("focus (click-in) before typing clears the ghost", () => {
    const s = ghostReducer(opened, { type: "focusClear" });
    expect(s.ghost).toBeNull();
    expect(s.input).toBe("");
    expect(s.dismissed).toBe(true);
  });
});
