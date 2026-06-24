import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { versionToReleaseRow } from "./transform.ts";

const PID = "84f91caf-7511-470a-9a26-3e52e66258bf";

Deno.test("unreleased version -> in_progress, dates mapped", () => {
  const row = versionToReleaseRow(
    { id: 12236, name: "Refactor-Senaei 3.0-19 Feb 26", releaseDate: "2026-02-19", released: false },
    PID,
  );
  assertEquals(row.status, "in_progress");
  assertEquals(row.jira_version_id, "12236");
  assertEquals(row.name, "Refactor-Senaei 3.0-19 Feb 26");
  assertEquals(row.title, "Refactor-Senaei 3.0-19 Feb 26");
  assertEquals(row.release_date, "2026-02-19");
  assertEquals(row.target_date, "2026-02-19");
  assertEquals(row.start_date, null);
});

Deno.test("released version -> released", () => {
  const row = versionToReleaseRow({ id: 1, name: "v1", released: true, releaseDate: "2026-01-01" }, PID);
  assertEquals(row.status, "released");
});

Deno.test("archived takes precedence over released", () => {
  const row = versionToReleaseRow({ id: 2, name: "v2", released: true, archived: true }, PID);
  assertEquals(row.status, "archived");
});

Deno.test("no dates -> null target_date (no fabrication)", () => {
  const row = versionToReleaseRow({ id: 3, name: "No work items rel" }, PID);
  assertEquals(row.start_date, null);
  assertEquals(row.release_date, null);
  assertEquals(row.target_date, null);
  assertEquals(row.description, null);
});

Deno.test("startDate used as target fallback when no releaseDate", () => {
  const row = versionToReleaseRow({ id: 4, name: "v4", startDate: "2026-03-01" }, PID);
  assertEquals(row.target_date, "2026-03-01");
  assertEquals(row.release_date, null);
});
