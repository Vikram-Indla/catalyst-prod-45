import { describe, it, expect } from "vitest";
import {
  getCuratedSuggestions,
  type SearchSurface,
} from "../searchSuggestions";

const SURFACES: SearchSurface[] = ["backlog", "list", "kanban"];

describe("getCuratedSuggestions", () => {
  it("returns 2-3 suggestions for every surface", () => {
    for (const surface of SURFACES) {
      const out = getCuratedSuggestions(surface, "BAU");
      expect(out.length).toBeGreaterThanOrEqual(2);
      expect(out.length).toBeLessThanOrEqual(3);
    }
  });

  it("interpolates the project key into the suggestion text", () => {
    const out = getCuratedSuggestions("backlog", "BAU");
    expect(out.some((s) => s.includes("BAU"))).toBe(true);
    expect(out.every((s) => !s.includes("${project}"))).toBe(true);
  });

  it("falls back to a neutral phrase when projectKey is null (no lie)", () => {
    const out = getCuratedSuggestions("list", null);
    expect(out.every((s) => !s.includes("${project}"))).toBe(true);
    expect(out.some((s) => s.includes("this project"))).toBe(true);
  });

  it("gives each surface its own distinct suggestion set", () => {
    const backlog = getCuratedSuggestions("backlog", "BAU").join("|");
    const kanban = getCuratedSuggestions("kanban", "BAU").join("|");
    expect(backlog).not.toEqual(kanban);
  });
});
