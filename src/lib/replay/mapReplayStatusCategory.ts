import type { ReplayStatusCategory } from "./liveReplayTypes";

// Conservative 3-bucket mapping mirroring wh-jira-changelog-backfill/mapper.ts
const DONE_KEYWORDS = [
  "done", "complete", "complet", "closed", "resolved", "resolv",
  "ready for production", "in production", "released", "releas",
  "cancelled", "canceled", "accepted", "accept",
];

const TODO_KEYWORDS = [
  "to do", "todo", "new", "open", "backlog", "intake",
  "requirement", "blocked", "pending", "on hold",
  "ready for development", "ready for design", "waiting",
];

export function mapReplayStatusCategory(
  statusName: string | null | undefined,
  phStatusCategory?: string | null,
): ReplayStatusCategory {
  // ph_issues.status_category already normalised — prefer it
  if (phStatusCategory) {
    const s = phStatusCategory.toLowerCase().trim();
    if (s === "done" || s === "complete" || s === "released") return "done";
    if (s === "to do" || s === "todo" || s === "new") return "todo";
    if (s === "in progress" || s === "indeterminate") return "prog";
  }

  if (!statusName) return "todo";
  const k = statusName.toLowerCase().trim();

  for (const kw of DONE_KEYWORDS) {
    if (k === kw || k.includes(kw)) return "done";
  }
  for (const kw of TODO_KEYWORDS) {
    if (k === kw || k.includes(kw)) return "todo";
  }
  return "prog";
}
