import type { Priority, WorkItemType } from "@catylast/icons";

// ---------- types ----------

export type Status = "To do" | "In progress" | "In review" | "Done";

/** Re-export the Catylast icon names so the rest of the demo can use them. */
export type { Priority, WorkItemType } from "@catylast/icons";

export type User = { id: string; name: string };

/**
 * A project owns a key prefix — every ticket created under it gets that
 * prefix plus an auto-incrementing number (`IRP-1`, `IRP-2`, …). The
 * mapping from `projectId` → key is the source of truth; the human-
 * readable ticket key on each row is derived, never hand-written.
 */
export type Project = {
  /** Stable identifier — used to reference the project on each Issue. */
  id: string;
  /** Full project name (shown in the project selector). */
  name: string;
  /** Short uppercase prefix used in ticket keys (e.g. `IRP`, `SS`, `CAT`). */
  key: string;
};

export type Issue = {
  id: string;
  /** The project this ticket belongs to — drives the key prefix. */
  projectId: string;
  /** Display key — `${project.key}-${n}`. Derived from `projectId`. */
  key: string;
  type: WorkItemType;
  summary: string;
  status: Status;
  priority: Priority;
  assignee?: User | null;
  storyPoints?: number;
  /** 0–100 completion. Hidden when undefined. */
  progress?: number;
  children?: Issue[];
};

// ---------- constants ----------

export const STATUSES: Status[] = ["To do", "In progress", "In review", "Done"];

/** The five most common types — used as a starter set inside the
 *  +Create work item dropdown. The full 14-icon catalog lives in
 *  `@catylast/icons` (`WORK_ITEM_TYPE_NAMES`). */
export const WORK_ITEM_TYPES: WorkItemType[] = [
  "epic",
  "story",
  "task",
  "sub-task",
  "qa-bug",
];

/**
 * Seed projects. Consumers can replace this list entirely in their own
 * app — the DemoTable just needs at least one project to compute
 * ticket keys. The `key` is the uppercase prefix that ends up in front
 * of every ticket number. Pick something short and recognizable.
 */
export const PROJECTS: Project[] = [
  { id: "cat", name: "Catylast", key: "CAT" },
  { id: "irp", name: "International Relation Platform", key: "IRP" },
  { id: "ss", name: "Sectorial Services", key: "SS" },
];

export function getProject(
  projects: Project[],
  projectId: string,
): Project | undefined {
  return projects.find((p) => p.id === projectId);
}

/**
 * Format a numeric ticket sequence into the canonical
 * `${project.key}-${n}` shape (e.g. `IRP-42`). Always uses the
 * project's `key`, never the `id` — IDs are internal.
 */
export function formatTicketKey(project: Project, n: number): string {
  return `${project.key}-${n}`;
}

/**
 * Walk the issue tree and return the next ticket number for the given
 * project — one greater than the highest existing number under that
 * project's prefix. Used by `+Create` and `+Add child` so newly-
 * created issues never collide with existing ones.
 */
export function nextTicketNumber(
  issues: Issue[],
  project: Project,
): number {
  const prefix = `${project.key}-`;
  let max = 0;
  const walk = (list: Issue[]): void => {
    for (const item of list) {
      if (item.key.startsWith(prefix)) {
        const tail = Number.parseInt(item.key.slice(prefix.length), 10);
        if (Number.isFinite(tail) && tail > max) max = tail;
      }
      if (item.children) walk(item.children);
    }
  };
  walk(issues);
  return max + 1;
}

export const PEOPLE = {
  wasim: { id: "u1", name: "Wasim Khan" },
  alex: { id: "u2", name: "Alex Doe" },
  maya: { id: "u3", name: "Maya Patel" },
  sarah: { id: "u4", name: "Sarah Lee" },
  tom: { id: "u5", name: "Tom Williams" },
  priya: { id: "u6", name: "Priya Sharma" },
  jordan: { id: "u7", name: "Jordan Reyes" },
  ben: { id: "u8", name: "Ben Cooper" },
} as const satisfies Record<string, User>;

export const USERS: User[] = Object.values(PEOPLE);

// ---------- initial mock data ----------
//
// The `type` and `priority` strings are exactly the icon-registry keys
// from `@catylast/icons`, so cell renderers can pass them straight to
// `<WorkItemTypeIcon name={...} />` / `<PriorityIcon name={...} />`
// without any mapping layer.

// The top-level rows interleave projects on purpose — when the user
// opens the Showcase, the very first three visible rows already show
// three different prefixes (`IRP-1`, `CAT-1`, `SS-1`) so it's obvious
// the prefix is project-driven, not a hardcoded `CAT-*` sequence. Use
// the project selector in the toolbar to switch the prefix used by
// new tickets.

export const initialIssues: Issue[] = [
  // International Relation Platform — IRP-* prefix.
  {
    id: "epic-2",
    projectId: "irp",
    key: "IRP-1",
    type: "epic",
    summary: "Member onboarding portal",
    status: "In progress",
    priority: "highest",
    assignee: PEOPLE.wasim,
    storyPoints: 13,
    progress: 40,
    children: [
      {
        id: "2.1",
        projectId: "irp",
        key: "IRP-2",
        type: "frontend",
        summary: "Self-service registration form",
        status: "In progress",
        priority: "highest",
        assignee: PEOPLE.wasim,
        storyPoints: 5,
        progress: 70,
      },
      {
        id: "2.2",
        projectId: "irp",
        key: "IRP-3",
        type: "task",
        summary: "Document upload with virus scan",
        status: "To do",
        priority: "high",
        assignee: PEOPLE.alex,
        storyPoints: 5,
        progress: 0,
      },
      {
        id: "2.3",
        projectId: "irp",
        key: "IRP-4",
        type: "task",
        summary: "Audit-log integration for sensitive actions",
        status: "Done",
        priority: "medium",
        storyPoints: 3,
        progress: 100,
      },
    ],
  },
  // Catylast (component library) work — CAT-* prefix.
  {
    id: "epic-1",
    projectId: "cat",
    key: "CAT-1",
    type: "epic",
    summary: "Component library foundations",
    status: "In progress",
    priority: "high",
    assignee: PEOPLE.wasim,
    storyPoints: 21,
    progress: 75,
    children: [
      {
        id: "1.1",
        projectId: "cat",
        key: "CAT-2",
        type: "story",
        summary: "Design tokens — primitives plus semantic",
        status: "Done",
        priority: "high",
        assignee: PEOPLE.alex,
        storyPoints: 5,
        progress: 100,
      },
      {
        id: "1.2",
        projectId: "cat",
        key: "CAT-3",
        type: "story",
        summary: "Theme provider with system mode",
        status: "Done",
        priority: "medium",
        assignee: PEOPLE.wasim,
        storyPoints: 3,
        progress: 100,
      },
      {
        id: "1.3",
        projectId: "cat",
        key: "CAT-4",
        type: "task",
        summary: "Icon system with swappable registry",
        status: "In review",
        priority: "medium",
        assignee: PEOPLE.maya,
        storyPoints: 5,
        progress: 80,
      },
      {
        id: "1.4",
        projectId: "cat",
        key: "CAT-5",
        type: "feature",
        summary: "Primitives — Button, Avatar, Menu, Checkbox, etc.",
        status: "In progress",
        priority: "high",
        assignee: PEOPLE.alex,
        storyPoints: 8,
        progress: 60,
      },
    ],
  },
  // Sectorial Services — SS-* prefix.
  {
    id: "epic-3",
    projectId: "ss",
    key: "SS-1",
    type: "task",
    summary: "Visual regression coverage in CI",
    status: "To do",
    priority: "medium",
    storyPoints: 5,
    progress: 0,
  },
  {
    id: "epic-4",
    projectId: "cat",
    key: "CAT-6",
    type: "task",
    summary: "Cut 0.1.0 release via Changesets",
    status: "Done",
    priority: "low",
    storyPoints: 2,
    progress: 100,
  },
];

// ---------- flat dataset for focused (single-feature) stories ----------
//
// This list intentionally exercises a wide spread of work-item types
// and priorities so individual stories can showcase the brand-color
// icons without crafting bespoke fixtures.

export const flatIssues: Issue[] = [
  // Catylast — CAT-* (5 issues)
  {
    id: "f-1",
    projectId: "cat",
    key: "CAT-101",
    type: "task",
    summary: "Audit accessibility on the auth flow",
    status: "In progress",
    priority: "high",
    assignee: PEOPLE.maya,
    storyPoints: 5,
    progress: 60,
  },
  {
    id: "f-2",
    projectId: "cat",
    key: "CAT-102",
    type: "story",
    summary: "Add keyboard shortcuts to the issue detail",
    status: "To do",
    priority: "medium",
    assignee: PEOPLE.alex,
    storyPoints: 3,
    progress: 0,
  },
  {
    id: "f-3",
    projectId: "cat",
    key: "CAT-103",
    type: "qa-bug",
    summary: "Sticky header flickers on Safari",
    status: "In review",
    priority: "highest",
    assignee: PEOPLE.wasim,
    storyPoints: 2,
    progress: 80,
  },
  {
    id: "f-4",
    projectId: "cat",
    key: "CAT-104",
    type: "task",
    summary: "Document the icon registry swap procedure",
    status: "Done",
    priority: "low",
    assignee: PEOPLE.sarah,
    storyPoints: 1,
    progress: 100,
  },
  {
    id: "f-5",
    projectId: "cat",
    key: "CAT-105",
    type: "sub-task",
    summary: "Wire telemetry into the create-issue handler",
    status: "To do",
    priority: "medium",
    assignee: PEOPLE.tom,
    storyPoints: 2,
    progress: 0,
  },
  // International Relation Platform — IRP-* (5 issues)
  {
    id: "f-6",
    projectId: "irp",
    key: "IRP-12",
    type: "story",
    summary: "Inline edit for due dates",
    status: "To do",
    priority: "high",
    storyPoints: 5,
    progress: 0,
  },
  {
    id: "f-7",
    projectId: "irp",
    key: "IRP-13",
    type: "production-incident",
    summary: "Editor crashes on slash-menu race condition",
    status: "In progress",
    priority: "highest",
    assignee: PEOPLE.priya,
    storyPoints: 3,
    progress: 35,
  },
  {
    id: "f-8",
    projectId: "irp",
    key: "IRP-14",
    type: "frontend",
    summary: "Migrate the work-item card to the new primitive",
    status: "In progress",
    priority: "medium",
    assignee: PEOPLE.alex,
    storyPoints: 8,
    progress: 50,
  },
  {
    id: "f-9",
    projectId: "irp",
    key: "IRP-15",
    type: "backend",
    summary: "Pagination + cursor support for /issues endpoint",
    status: "To do",
    priority: "high",
    assignee: PEOPLE.jordan,
    storyPoints: 5,
    progress: 0,
  },
  {
    id: "f-10",
    projectId: "irp",
    key: "IRP-16",
    type: "feature",
    summary: "Dark-mode polish across overlays",
    status: "Done",
    priority: "low",
    assignee: PEOPLE.maya,
    storyPoints: 5,
    progress: 100,
  },
  // Sectorial Services — SS-* (5 issues)
  {
    id: "f-11",
    projectId: "ss",
    key: "SS-7",
    type: "change-request",
    summary: "Tighten retention policy on draft comments",
    status: "In review",
    priority: "lowest",
    assignee: PEOPLE.ben,
    storyPoints: 2,
    progress: 90,
  },
  {
    id: "f-12",
    projectId: "ss",
    key: "SS-8",
    type: "figma",
    summary: "Designer handoff: data table polish",
    status: "Done",
    priority: "medium",
    assignee: PEOPLE.sarah,
    storyPoints: 3,
    progress: 100,
  },
  {
    id: "f-13",
    projectId: "ss",
    key: "SS-9",
    type: "api-requirement",
    summary: "Mention API: support cross-project lookups",
    status: "To do",
    priority: "none",
    storyPoints: 3,
    progress: 0,
  },
  {
    id: "f-14",
    projectId: "ss",
    key: "SS-10",
    type: "integration",
    summary: "GitHub issue mirror — two-way sync",
    status: "To do",
    priority: "high",
    assignee: PEOPLE.tom,
    storyPoints: 8,
    progress: 0,
  },
  {
    id: "f-15",
    projectId: "ss",
    key: "SS-11",
    type: "business-gap",
    summary: "Custom fields without admin escalation",
    status: "In progress",
    priority: "medium",
    assignee: PEOPLE.priya,
    storyPoints: 5,
    progress: 25,
  },
  // The remaining rows push the dataset comfortably over the default
  // pagination page-size of 20 so the pagination chrome renders on the
  // Default / Showcase stories without forcing the consumer to pass
  // their own data.
  {
    id: "f-16",
    projectId: "cat",
    key: "CAT-106",
    type: "story",
    summary: "Refactor token build pipeline for incremental output",
    status: "In review",
    priority: "medium",
    assignee: PEOPLE.alex,
    storyPoints: 5,
    progress: 80,
  },
  {
    id: "f-17",
    projectId: "cat",
    key: "CAT-107",
    type: "task",
    summary: "Expand visual-regression coverage to overlays",
    status: "To do",
    priority: "low",
    assignee: PEOPLE.maya,
    storyPoints: 3,
    progress: 0,
  },
  {
    id: "f-18",
    projectId: "irp",
    key: "IRP-17",
    type: "qa-bug",
    summary: "Date-range picker drifts by one day in Sydney TZ",
    status: "In progress",
    priority: "highest",
    assignee: PEOPLE.wasim,
    storyPoints: 2,
    progress: 40,
  },
  {
    id: "f-19",
    projectId: "irp",
    key: "IRP-18",
    type: "frontend",
    summary: "Skeleton state for issue detail pane on initial load",
    status: "Done",
    priority: "medium",
    assignee: PEOPLE.priya,
    storyPoints: 3,
    progress: 100,
  },
  {
    id: "f-20",
    projectId: "irp",
    key: "IRP-19",
    type: "task",
    summary: "Backfill `projectId` on legacy tickets from 2024",
    status: "To do",
    priority: "low",
    storyPoints: 5,
    progress: 0,
  },
  {
    id: "f-21",
    projectId: "ss",
    key: "SS-12",
    type: "production-incident",
    summary: "Slack webhook retries flood on rate-limit storms",
    status: "In review",
    priority: "highest",
    assignee: PEOPLE.jordan,
    storyPoints: 2,
    progress: 70,
  },
  {
    id: "f-22",
    projectId: "ss",
    key: "SS-13",
    type: "feature",
    summary: "Bulk reassign from board context menu",
    status: "To do",
    priority: "medium",
    assignee: PEOPLE.ben,
    storyPoints: 5,
    progress: 0,
  },
  {
    id: "f-23",
    projectId: "cat",
    key: "CAT-108",
    type: "sub-task",
    summary: "Dark-mode polish for the date-range picker popover",
    status: "Done",
    priority: "low",
    assignee: PEOPLE.maya,
    storyPoints: 2,
    progress: 100,
  },
  {
    id: "f-24",
    projectId: "cat",
    key: "CAT-109",
    type: "task",
    summary: "Typecheck the storybook app in CI on every PR",
    status: "In progress",
    priority: "medium",
    assignee: PEOPLE.wasim,
    storyPoints: 3,
    progress: 50,
  },
  {
    id: "f-25",
    projectId: "ss",
    key: "SS-14",
    type: "api-requirement",
    summary: "Expose ticket-key counter via admin API",
    status: "To do",
    priority: "lowest",
    storyPoints: 3,
    progress: 0,
  },
  {
    id: "f-26",
    projectId: "irp",
    key: "IRP-20",
    type: "change-request",
    summary: "Move the 'Insert element' modal trigger into the toolbar",
    status: "Done",
    priority: "medium",
    assignee: PEOPLE.alex,
    storyPoints: 2,
    progress: 100,
  },
  {
    id: "f-27",
    projectId: "cat",
    key: "CAT-110",
    type: "story",
    summary: "Story-points cell — accept fractional values (0.5, 1.5)",
    status: "To do",
    priority: "lowest",
    storyPoints: 2,
    progress: 0,
  },
];

// ---------- tree helpers (pure functions) ----------

export function flatten(items: Issue[]): Issue[] {
  return items.flatMap((item) =>
    item.children ? [item, ...flatten(item.children)] : [item],
  );
}

export function descendantIds(item: Issue): Set<string> {
  const ids = new Set<string>();
  const walk = (i: Issue) => {
    ids.add(i.id);
    i.children?.forEach(walk);
  };
  walk(item);
  return ids;
}

export function eligibleParents(items: Issue[], rowId: string): Issue[] {
  const all = flatten(items);
  const row = all.find((i) => i.id === rowId);
  if (!row) return all;
  const exclude = descendantIds(row);
  return all.filter((i) => !exclude.has(i.id));
}

export function addChildToParent(
  items: Issue[],
  parentId: string,
  newItem: Issue,
): Issue[] {
  return items.map((item) => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children ?? []), newItem] };
    }
    if (item.children) {
      return {
        ...item,
        children: addChildToParent(item.children, parentId, newItem),
      };
    }
    return item;
  });
}

export function removeById(items: Issue[], id: string): Issue[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) =>
      item.children
        ? { ...item, children: removeById(item.children, id) }
        : item,
    );
}

export function updateById(
  items: Issue[],
  id: string,
  patch: Partial<Issue>,
): Issue[] {
  return items.map((item) => {
    if (item.id === id) {
      return { ...item, ...patch };
    }
    if (item.children) {
      return { ...item, children: updateById(item.children, id, patch) };
    }
    return item;
  });
}

export function findById(items: Issue[], id: string): Issue | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function moveToParent(
  items: Issue[],
  rowId: string,
  newParentId: string,
): Issue[] {
  let captured: Issue | null = null;
  const walk = (list: Issue[]): Issue[] =>
    list.flatMap((item) => {
      if (item.id === rowId) {
        captured = item;
        return [];
      }
      if (item.children) {
        return [{ ...item, children: walk(item.children) }];
      }
      return [item];
    });
  const removed = walk(items);
  if (!captured) return items;
  const insert = (list: Issue[]): Issue[] =>
    list.map((item) => {
      if (item.id === newParentId) {
        return {
          ...item,
          children: [...(item.children ?? []), captured as Issue],
        };
      }
      if (item.children) return { ...item, children: insert(item.children) };
      return item;
    });
  return insert(removed);
}
