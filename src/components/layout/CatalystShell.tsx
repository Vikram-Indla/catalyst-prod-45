import {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  ComponentType,
  useCallback,
} from "react";
import AkFlag, { FlagGroup } from "@atlaskit/flag";
import InfoIcon from "@atlaskit/icon/core/information-circle";
import SuccessIcon from "@atlaskit/icon/core/check-circle";
import WarningIcon from "@atlaskit/icon/core/warning";
import ErrorIcon from "@atlaskit/icon/core/error";
import { token } from "@atlaskit/tokens";
import { useCatalystFlagsStore, type CatalystFlagAppearance } from "@/store/catalystFlagsStore";
import { consumeLastLoginDisplay } from "@/hooks/useSessionPersistence";
import { Menu } from "@/lib/atlaskit-icons";
import { useGlobalSearchStore } from "@/store/globalSearchStore";
import { useNavBreakpoint } from "@/hooks/useNavBreakpoint";
import { GlobalMobileDrawer } from "./GlobalMobileDrawer";
import { HuddleFab } from "./HuddleFab";
import { HuddleIncoming } from "./HuddleIncoming";
import { HuddleScreenView } from "./HuddleScreenView";

/**
 * lazyWithRetry — defends against Vite stale-chunk errors after deploys/HMR.
 *
 * When a user has a tab open during a redeploy, the chunk URLs they loaded
 * earlier may 404 because Vite has produced new hashed chunks. The dynamic
 * import() rejects with "Failed to fetch dynamically imported module", which
 * bubbles up to ErrorBoundary and renders a blank page — exactly the /for-you
 * regression we are chasing today.
 *
 * Strategy: catch the failure, attempt a single hard reload (gated by
 * sessionStorage to avoid reload loops), then re-throw if reload doesn't help.
 */
function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName: string,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      const isStaleChunk =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");
      if (isStaleChunk && typeof window !== "undefined") {
        const key = `__catalyst_lazy_retry__${chunkName}`;
        const alreadyRetried = sessionStorage.getItem(key);
        if (!alreadyRetried) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          // Return a never-resolving promise so React keeps the Suspense
          // fallback up while the page reloads, instead of crashing.
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

const CatalystDetailRouter = lazyWithRetry(
  () => import("@/components/catalyst-detail-views/CatalystDetailRouter"),
  "CatalystDetailRouter",
);

import {
  useLocation,
  useParams,
  useMatch,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
const CatalystHeader = lazyWithRetry(
  () =>
    import("@/components/ja/CatalystHeader").then((m) => ({
      default: m.CatalystHeader,
    })),
  "CatalystHeader",
);
import {
  CatalystContextProvider,
  useCatalystContext,
} from "@/contexts/CatalystContext";
const AnnouncementBanner = lazyWithRetry(
  () =>
    import("@/components/notifications/AnnouncementBanner").then((m) => ({
      default: m.AnnouncementBanner,
    })),
  "AnnouncementBanner",
);
import { useTrackLastRoute } from "@/hooks/useSessionPersistence";
import { useEnabledModules } from "@/hooks/useModules";
import { useRecentPlaceTracker } from "@/hooks/useRecentPlaceTracker";
import { useRecordProjectVisit } from "@/hooks/home/useRecentProjects";
import { useCatalystTitle } from "@/hooks/useCatalystTitle";
import { derivePageFromPath } from "@/lib/tabIdentity";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

// ─── Lazy-loaded sidebars (only the active one loads into memory) ────
const UnifiedSidebar = lazyWithRetry(
  () => import("./UnifiedSidebar").then((m) => ({ default: m.UnifiedSidebar })),
  "UnifiedSidebar",
);
const EnterpriseSidebar = lazyWithRetry(
  () =>
    import("./EnterpriseSidebar").then((m) => ({
      default: m.EnterpriseSidebar,
    })),
  "EnterpriseSidebar",
);
const ProductRoomSidebar = lazyWithRetry(
  () =>
    import("./ProductRoomSidebar").then((m) => ({
      default: m.ProductRoomSidebar,
    })),
  "ProductRoomSidebar",
);
const IdeationSidebar = lazyWithRetry(
  () =>
    import("./IdeationSidebar").then((m) => ({ default: m.IdeationSidebar })),
  "IdeationSidebar",
);
const ProjectSidebar = lazyWithRetry(
  () => import("./ProjectSidebar").then((m) => ({ default: m.ProjectSidebar })),
  "ProjectSidebar",
);
const ReleaseRoomSidebar = lazyWithRetry(
  () =>
    import("./OperationsSidebar").then((m) => ({
      default: m.ReleaseRoomSidebar,
    })),
  "ReleaseRoomSidebar",
);
const ReleasesManagementSidebar = lazyWithRetry(
  () =>
    import("./ReleasesManagementSidebar").then((m) => ({
      default: m.ReleasesManagementSidebar,
    })),
  "ReleasesManagementSidebar",
);
const ReleaseHubSidebar = lazyWithRetry(
  () =>
    import("./ReleaseHubSidebar").then((m) => ({
      default: m.ReleaseHubSidebar,
    })),
  "ReleaseHubSidebar",
);
const IncidentHubSidebar = lazyWithRetry(
  () =>
    import("./IncidentHubSidebar").then((m) => ({
      default: m.IncidentHubSidebar,
    })),
  "IncidentHubSidebar",
);
const TestHubSidebar = lazyWithRetry(
  () =>
    import("./TestHubSidebar").then((m) => ({
      default: m.TestHubSidebar,
    })),
  "TestHubSidebar",
);
const PlanHubSidebar = lazyWithRetry(
  () => import("./PlanHubSidebar").then((m) => ({ default: m.PlanHubSidebar })),
  "PlanHubSidebar",
);
const TasksSidebar = lazyWithRetry(
  () => import("./TasksSidebar").then((m) => ({ default: m.TasksSidebar })),
  "TasksSidebar",
);
const ProjectHubSidebar = lazyWithRetry(
  () =>
    import("./ProjectHubSidebar").then((m) => ({
      default: m.ProjectHubSidebar,
    })),
  "ProjectHubSidebar",
);
const ProductHubSidebar = lazyWithRetry(
  () =>
    import("./ProductHubSidebar").then((m) => ({
      default: m.ProductHubSidebar,
    })),
  "ProductHubSidebar",
);
const ChatSidebar = lazyWithRetry(
  () =>
    import("./ChatSidebar").then((m) => ({
      default: m.ChatSidebar,
    })),
  "ChatSidebar",
);
const WikiSidebar = lazyWithRetry(
  () => import("./WikiSidebar").then((m) => ({ default: m.WikiSidebar })),
  "WikiSidebar",
);
// C1 · Personal command center on / (Home). Replaces the empty 240px rail
// users were seeing on Home with @atlaskit/side-navigation sections for
// Pinned, Recent and Jump to. Atlaskit-only — see HomeSidebar.tsx.
const HomeSidebar = lazyWithRetry(() => import("./HomeSidebar"), "HomeSidebar");
const AdminSidebarV2 = lazyWithRetry(
  () =>
    import("@/components/admin/AdminSidebarV2").then((m) => ({
      default: m.AdminSidebarV2,
    })),
  "AdminSidebarV2",
);

import { HubSurface } from "./HubSurface";

/**
 * Decision A (Apr 2026) — Jira blue-canvas on hub routes.
 * Kept local to this file (no shared hook) so the whole trial can be reverted
 * by unwinding this file + HubSurface.tsx. Mirrors the dark-aware logic used
 * in HubSurface so both stay consistent when DARK MODE toggles.
 */
// V3 Canonical White Canvas (Apr 27, 2026 audit, L36).
// Was '#E9F2FE' (light Jira blue) — painted on <main> for every hub-surface
// route, producing a global blue tint that didn't match Jira's actual
// background (which is white var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))). Catalyst owner decision: all hub
// pages are white-canvas. Kept as a named constant in case we ever bring
// back a tinted page wash.
const JIRA_CANVAS_BG =
  "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))";

// Apr 28, 2026 (Vikram): SidebarEdgeReveal deprecated. The 8px-wide
// edge-reveal strip + |> hover-handle tooltip was a redundant third
// affordance for restoring the sidebar — the header chevron in the
// top-nav and the ⌘/Ctrl + [ keyboard shortcut already cover the same
// flow. The hover handle floated unanchored on certain layouts and the
// aria-label "Show sidebar (shortcut: ⌘ [)" surfaced as a stray tooltip
// on the table column edge. Removed. When sidebarHidden is true the
// shell now renders the same zero-width placeholder used for the
// intermediate state, so the layout stays stable.

const HUB_ROUTES: Record<string, string> = {
  home: '/for-you',
  strategy: '/strategyhub',
  ideation: '/ideation/backlog',
  product: '/product-hub',
  project: '/project-hub',
  release: '/release-hub/overview',
  incident: '/incident-hub',
  task: '/tasks/overview',
  plan: '/planhub',
  wiki: '/wiki',
};

function CatalystShellContent() {
  // Dev-only instrumentation: prove shell doesn't remount on program navigation
  if (import.meta.env.DEV) {
    console.debug("[CatalystShell] render");
  }

  // Presence heartbeat — writes available/away to user_presence every 45s.
  // Detects idle (10 min no input → away) and tab visibility changes.
  // Must mount in the app shell so it runs for the full authenticated session.
  usePresenceHeartbeat();

  // Track last visited route for session persistence
  useTrackLastRoute();

  // Track room visits for Recent Rooms functionality
  useRecentPlaceTracker();
  // Track ProjectHub project visits for Home rail "Recent projects"
  useRecordProjectVisit();
  const location = useLocation();
  const page = derivePageFromPath(location.pathname);
  const navigate = useNavigate();
  const params = useParams<{
    programId?: string;
    portfolioId?: string;
    teamId?: string;
    projectId?: string;
    projectKey?: string;
  }>();
  const {
    workspaceType,
    programId: contextProgramId,
    projectId: contextProjectId,
    selectedQuarter,
    setSelectedQuarter,
    sidebarExpanded,
    setSidebarExpanded,
    sidebarHidden,
    setSidebarHidden,
    sidebarPinned,
    setSidebarPinned,
    sidebarHoverOpen,
    cycleSidebarState,
  } = useCatalystContext();

  // ─── Sidebar is CLICK-ONLY (April 2026, final) ────────────────────────
  // Per user direction: hover-peek is fully disabled across every route.
  // The sidebar opens / closes ONLY via:
  //   • Click on the header chevron → cycleSidebarState
  //   • Cmd/Ctrl + [ keyboard shortcut → cycleSidebarState
  // No mousemove listener, no hover triggers, no peek. The Apr 27 2026
  // SidebarEdgeReveal handle was deprecated Apr 28 2026 — see the
  // comment above the shell render block. sidebarHoverOpen stays in
  // context (other surfaces still read it) but nothing in this shell
  // ever sets it to true anymore.

  // Effective visibility (Jira parity):
  //   - Pinned + not hidden → solid sidebar panel (pushes content right)
  //   - Hover-peek → overlay panel, regardless of whether sidebarHidden is
  //     true (peeking from edge-reveal) or false (peeking from a half-state).
  //     We no longer require !sidebarHidden, because the chevron is now
  //     always in the top-nav and we don't mutate sidebarHidden on hover.
  // Overlay mode is any "visible but not pinned" render — i.e. a peek.
  const sidebarVisuallyOpen =
    (sidebarPinned && !sidebarHidden) || sidebarHoverOpen;
  const sidebarOverlayMode = !sidebarPinned && sidebarHoverOpen;

  // ⌘/Ctrl + [ toggles the sidebar (Jira parity, P2-1). Requires the platform
  // modifier so we don't swallow a literal `[` keystroke in any focusable
  // element — the previous bare-`[` binding collided with typing into
  // non-guarded roles (code editors, rich-text surfaces, etc.).
  // macOS → ⌘+[ ; other platforms → Ctrl+[. The preventDefault stops the
  // browser-back navigation the combo normally triggers on Chrome/Safari.
  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "[") return;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (!modifier) return;
      if (e.altKey || e.shiftKey) return;
      e.preventDefault();
      cycleSidebarState();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cycleSidebarState]);

  // ─── Mobile / tablet drawer (Loop 2, 2026-04-30) ──────────────────────
  // At <1024px the inline sidebar rail is unmounted; the same sidebar
  // node is rendered inside GlobalMobileDrawer instead. Desktop ≥1024px
  // is byte-identical to baseline — none of the JSX below changes.
  const { isNarrow } = useNavBreakpoint();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Auto-close on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Auto-close if viewport grows back to desktop
  useEffect(() => {
    if (!isNarrow && mobileDrawerOpen) setMobileDrawerOpen(false);
  }, [isNarrow, mobileDrawerOpen]);

  const { isModuleEnabled } = useEnabledModules();

  // Extract IDs from URL params - these take precedence
  const urlProgramId = params.programId || null;
  const urlProjectId = params.projectId || null;
  // useParams can't see child-route params — use useMatch to extract :projectKey
  // from the InJira layout route (/project/:projectKey/*) from an ancestor component.
  const inJiraMatch = useMatch("/project/:projectKey/*");
  const urlProjectKey = inJiraMatch?.params?.projectKey ?? null;

  // Determine which ID to use based on route pattern
  const isProgramRoute = location.pathname.startsWith("/program/");
  const isProjectRoute =
    location.pathname.startsWith("/projects/") ||
    location.pathname.startsWith("/project/");
  // InJira routes use :projectKey (string key like "BAU"), not :projectId (UUID)
  const isInJiraRoute = isProjectRoute && !!urlProjectKey && !urlProjectId;

  // Current active IDs
  const activeProgramId = isProgramRoute ? urlProgramId : contextProgramId;
  const activeProjectId = isProjectRoute ? urlProjectId : contextProjectId;

  // Fetch project details for sidebar (UUID-based routes)
  const { data: projectData } = useQuery({
    queryKey: ["project-sidebar", activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, key")
        .eq("id", activeProjectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeProjectId && isProjectRoute,
  });

  // Fetch project by key for InJira routes (/project/:projectKey/*)
  const { data: projectByKeyData } = useQuery({
    queryKey: ["project-sidebar-by-key", urlProjectKey],
    queryFn: async () => {
      if (!urlProjectKey) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, key")
        .eq("key", urlProjectKey)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isInJiraRoute,
  });

  // Effective project ID and name — prefers UUID param, falls back to key lookup
  const effectiveProjectId = activeProjectId || projectByKeyData?.id || null;
  const effectiveProjectName = projectData?.name || projectByKeyData?.name;

  // Check if on product/producthub route
  // Ideation is a peer hub at /ideation/*. Must be checked BEFORE isProductRoute
  // because the latter previously caught /product/ideas/* — those URLs now
  // redirect to /ideation/*, but the redirect is a transient state and we
  // want IdeationSidebar to render the moment the new URL lands.
  const isIdeationRoute = location.pathname.startsWith("/ideation");
  const isProductRoute =
    !isIdeationRoute &&
    (location.pathname.startsWith("/producthub") ||
      location.pathname.startsWith("/product"));

  // Check if on release route (Operations/Incidents)
  const isReleaseRoute = location.pathname.startsWith("/release");

  // Check if on releases route (Release & Test Management module - legacy)
  const isReleasesRoute = location.pathname.startsWith("/releases");

  // Check on releasehub route (new Release Management module)
  const isReleaseHubRoute =
    location.pathname.startsWith("/release-hub") ||
    location.pathname.startsWith("/releasehub");

  // Check if on test management route

  // Check if on PlanHub route
  const isPlanHubRoute = location.pathname.startsWith("/planhub");

  // Check if on TaskHub route (includes /priorities which is part of TaskHub)
  const isTaskHubRoute =
    location.pathname.startsWith("/tasks") ||
    location.pathname.startsWith("/priorities");

  // Check if on ProductHub V5 route (/product-hub/*)
  const isProductHubRoute = location.pathname.startsWith("/product-hub");

  // Check if on ProjectHub V5 route (/project-hub/*)
  const isProjectHubRoute = location.pathname.startsWith("/project-hub");
  const isProjectHubAllWorkRoute =
    /\/project-hub\/[^/]+\/allwork(\/|$|\?)/.test(location.pathname);
  // Apr 27, 2026 (L67): backlog route also needs the fullpage flex chain
  // (flex-1 min-h-0 overflow-hidden) so the rail's internal scroll fires
  // instead of pushing the whole page taller than viewport. Without
  // min-h-0 on the wrapper, the rail's content height (1638px) leaks
  // up the chain and the table column extends with it. Adding backlog
  // to the same code path that allwork uses.
  const isProjectHubBacklogRoute = /\/(project|product)-hub\/[^/]+\/backlog/.test(
    location.pathname,
  );
  // Dependencies is a full-bleed React Flow canvas — drop the LEFT/RIGHT frame
  // padding (like AllWork) so the canvas runs edge-to-edge with no side gutters
  // (Vikram 2026-06-25). Top/bottom keep 24px.
  const isProjectHubDependenciesRoute = /\/(?:project-hub\/[^/]+|product-hub\/[^/]+|incident-hub)\/dependencies(?:\/|$|\?)/.test(
    location.pathname,
  );

  // Check if on full-screen issue view (/browse/:issueKey)
  const isIssueFullPageRoute = location.pathname.startsWith("/browse/");

  // Chat owns its own grid layout (c-chat-shell) and must NOT be inside
  // a scroll container — same fullpage flex chain as allwork/backlog.
  const isChatRoute = location.pathname.startsWith("/chat");

  // Release detail (/release-hub/releases-management/:releaseId) needs an
  // independently-scrolling right rail — same fullpage flex chain so the
  // page wrapper does NOT scroll; left main + right rail scroll on their own.
  // 2026-06-26: sprint detail (/project-hub/:key/sprints/:sprintId) mounts
  // the same canonical ReleaseDetailPage via SPRINT_CONFIG and needs the
  // same flex chain — name kept (isReleaseDetailRoute) because the layout
  // contract is identical regardless of entity kind.
  const isReleaseDetailRoute =
    /\/release-hub\/releases-management\/[^/]+/.test(location.pathname) ||
    /\/project-hub\/[^/]+\/sprints\/[^/]+/.test(location.pathname);

  // Parse issue key from /issue/:issueKey for tab-title binding
  const fullPageIssueKey = isIssueFullPageRoute
    ? location.pathname.split("/")[2] || null
    : null;

  // Detail-drawer item (modal opened via GlobalSearch / Notifications / ForYou)
  const pendingDetailItem = useGlobalSearchStore((s) => s.pendingItem);

  // Fetch issue identity for tab title. Priority: detail drawer → full-page route.
  const issueLookupId = pendingDetailItem?.id ?? null;
  const issueLookupKey = fullPageIssueKey;
  const { data: tabIssueData } = useQuery({
    queryKey: ["tab-title-issue", issueLookupId, issueLookupKey],
    queryFn: async () => {
      if (issueLookupId) {
        const { data } = await supabase
          .from("catalyst_issues")
          .select("issue_key, title")
          .eq("id", issueLookupId)
          .maybeSingle();
        return data;
      }
      if (issueLookupKey) {
        const { data } = await supabase
          .from("catalyst_issues")
          .select("issue_key, title")
          .eq("issue_key", issueLookupKey)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!(issueLookupId || issueLookupKey),
    staleTime: 60_000,
  });

  // Compose tab title inputs (issue ▸ project ▸ page fallback ladder)
  const titleIssue =
    issueLookupId || issueLookupKey
      ? {
          key: tabIssueData?.issue_key ?? issueLookupKey ?? null,
          title: tabIssueData?.title ?? null,
        }
      : null;
  const titleProject = projectData
    ? { key: projectData.key, name: projectData.name }
    : null;
  useCatalystTitle({
    issue: titleIssue,
    project: titleProject,
    pageName: page,
  });

  // Check if on Wiki route
  const isWikiRoute = location.pathname.startsWith("/wiki");

  // Check if on IncidentHub route
  const isIncidentHubRoute = location.pathname.startsWith("/incident-hub");
  const isTestHubRoute = location.pathname.startsWith("/testhub");

  // Decision A (Apr 2026): Jira blue canvas (#E9F2FE) + white panel on all
  // hub routes. /for-you, Home, Wiki, Admin are intentionally excluded.
  const isHubSurfaceRoute =
    location.pathname.startsWith("/strategyhub") ||
    location.pathname.startsWith("/producthub") ||
    location.pathname.startsWith("/product/") || // /product/ideas/*, /product/room, etc.
    location.pathname.startsWith("/product-hub") ||
    location.pathname.startsWith("/project-hub") ||
    location.pathname.startsWith("/release-hub") ||
    location.pathname.startsWith("/releasehub") ||
    location.pathname.startsWith("/incident-hub") ||
    location.pathname.startsWith("/tasks") ||
    location.pathname.startsWith("/ideation") || // peer hub Ideation
    location.pathname.startsWith("/priorities");

  // Pages that already paint their own Jira canvas + white card. Wrapping these
  // in <HubSurface> would double-stack canvas layers. They still sit on the
  // canvas <main> bg so there's visual consistency.
  //   /project-hub/:key/backlog                       → BacklogPage.atlaskit.tsx:1083
  //   /project-hub/:key/allwork/:issueKey             → AllWorkDetailPage (fullPageMode)
  // 2026-06-07: allwork detail route added because the CatalystShell wrapper
  // at line 921 sets overflow-hidden for `isProjectHubAllWorkRoute`, expecting
  // the detail view to own its own scroll container — but HubSurface uses
  // minHeight (not height) and no flex chain, breaking the height cascade
  // for fullPageMode CatalystViewBase. Result: cv-drawer-body never gets a
  // constrained height, overflowY:auto never fires, content is clipped by
  // the overflow-hidden wrapper with no way to scroll. Bypassing HubSurface
  // on the detail route restores the height chain end-to-end. List view
  // (/project-hub/:key/allwork without :issueKey) still keeps HubSurface.
  const isSelfFramedRoute =
    /^\/(project|product)-hub\/[^/]+\/backlog/.test(location.pathname) ||
    /^\/project-hub\/[^/]+\/allwork\/[^/]+/.test(location.pathname) ||
    /^\/release-hub\/releases-management\/[^/]+$/.test(location.pathname) ||
    /^\/release-hub\/releases-management\/[^/]+\/work$/.test(location.pathname) ||
    /^\/project-hub\/[^/]+\/sprints\/[^/]+$/.test(location.pathname) ||
    /^\/project-hub\/[^/]+\/sprints\/[^/]+\/work$/.test(location.pathname) ||
    location.pathname.startsWith("/browse/"); // full-screen issue view

  // Hub routes that explicitly opt out of the Jira blue canvas — pure white
  // page surface (Confluence Spaces parity, not Jira hub parity). Owner
  // decision (Apr 2026): the All Projects landing should match Confluence's
  // Spaces page, not Jira's hub canvas.
  const isWhiteCanvasRoute =
    location.pathname === "/project-hub/projects" ||
    location.pathname === "/project/all-projects" ||
    location.pathname === "/product-hub/products";

  const shouldWrapHubSurface =
    isHubSurfaceRoute && !isSelfFramedRoute && !isWhiteCanvasRoute;
  // 2026-06-18 (Vikram): uniform viewport — the WHOLE shell is one flat tone.
  // Everything tracks --cp-bg-elevated (= var(--ds-surface, #FFFFFF) in light,
  // #22272B in dark), so header, sidebar, canvas and content are identical in
  // both modes — light: #FFFFFF (no regression), dark: #22272B (the grayish
  // raised tone, spread everywhere). Replaces the old data-theme==='dark'
  // branch, which never matched (data-theme is the compound ADS string
  // "dark:dark light:light …") and produced a two-tone band.
  const mainBg =
    "var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))";

  // Prevent full document reloads caused by accidental <a href="/..."> navigation.
  // IMPORTANT: In Preview, the URL contains special query params (e.g. __lovable_token).
  // If we drop them during navigation, the iframe may force a hard reload.
  const handleInternalLinkClickCapture = (e: React.MouseEvent) => {
    // Only left click without modifiers
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const target = e.target as HTMLElement | null;
    const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // Ignore new-tab/external/download/hash links
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;
    if (
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    )
      return;
    if (href.startsWith("http://") || href.startsWith("https://")) return;

    // Only handle internal absolute paths
    if (!href.startsWith("/")) return;

    e.preventDefault();

    // Merge current query params into the link (link query takes precedence)
    const [pathOnly, hrefQuery = ""] = href.split("?");
    const merged = new URLSearchParams(location.search);
    const linkParams = new URLSearchParams(hrefQuery);
    for (const [k, v] of linkParams.entries()) merged.set(k, v);

    const search = merged.toString();
    performance.mark?.("internal_link_nav");
    navigate(`${pathOnly}${search ? `?${search}` : ""}`);
  };

  // Determine sidebar based on workspaceType (single source of truth)
  const renderSidebar = (mobileForceExpanded?: boolean) => {
    const exp = mobileForceExpanded ?? sidebarExpanded;
    // Chat has its own self-contained sidebar (ConversationSidebar) — no shell sidebar here.
    if (location.pathname.startsWith("/chat")) {
      return null;
    }
    // C1 · Home (/) gets the personal command center rail. The previous
    // implementation fell through the workspaceType switch to `default:
    // null`, which left the wrapper mounted at 240px wide but empty —
    // reading as a broken state rather than a deliberate "no nav".
    // HomeSidebar fills the rail with Pinned / Recent / Jump-to sections,
    // turning that real estate into the user's own navigation surface.
    if (location.pathname === "/" || location.pathname === "/for-you" || location.pathname.startsWith("/for-you/")) {
      // HomeSidebar now composes SidebarBase, so it shares the canonical
      // hub-rail props (expanded + onToggle) with every other panel —
      // identical density, active-state, and collapse behaviour.
      return <HomeSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // Admin routes use AdminSidebarV2 — controlled by the global
    // cycleSidebarState (single-chevron contract, design-critique 2026-05-17).
    // When the sidebar is visible at all it renders at the full 240px, just
    // like every other hub sidebar. No more 64px icon-only mode.
    if (location.pathname.startsWith("/admin")) {
      return <AdminSidebarV2 expanded={exp} onToggle={cycleSidebarState} />;
    }

    // Full-screen issue view: show ProjectHub sidebar forced-collapsed
    if (isIssueFullPageRoute) {
      return <ProjectHubSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // Wiki sidebar
    if (isWikiRoute) {
      return <WikiSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // ProductHub V5 sidebar (/product-hub/*) — checked before isProductRoute so
    // /product-hub/* doesn't fall through to ProductRoomSidebar (which gates on
    // isModuleEnabled('PRODUCT') and may return null).
    if (isProductHubRoute) {
      return <ProductHubSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // ProjectHub V5 sidebar (/project-hub/*)
    if (isProjectHubRoute) {
      return <ProjectHubSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // ReleaseHub sidebar (new Release Management module)
    if (isReleaseHubRoute) {
      return <ReleaseHubSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // TestHub sidebar
    if (isTestHubRoute) {
      return <TestHubSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // IncidentHub sidebar
    if (isIncidentHubRoute) {
      return (
        <IncidentHubSidebar expanded={exp} onToggle={cycleSidebarState} />
      );
    }

    // Release & Test Management sidebar (legacy - being retired)
    if (isReleasesRoute) {
      return (
        <ReleasesManagementSidebar
          expanded={exp}
          onToggle={cycleSidebarState}
        />
      );
    }

    // Release route sidebar (Operations/Incidents)
    if (isReleaseRoute) {
      return (
        <ReleaseRoomSidebar expanded={exp} onToggle={cycleSidebarState} />
      );
    }

    // Ideation hub sidebar (/ideation/*) — peer hub, checked before Product
    // so the lifted Ideation surfaces don't fall through to ProductRoomSidebar.
    if (isIdeationRoute) {
      return <IdeationSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // Product route sidebar
    if (isProductRoute && isModuleEnabled("PRODUCT")) {
      return (
        <ProductRoomSidebar expanded={exp} onToggle={cycleSidebarState} />
      );
    }

    // PlanHub sidebar
    if (isPlanHubRoute) {
      return <PlanHubSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // TaskHub sidebar
    if (isTaskHubRoute) {
      return <TasksSidebar expanded={exp} onToggle={cycleSidebarState} />;
    }

    // Use workspaceType to determine sidebar
    switch (workspaceType) {
      case "program":
        if (activeProgramId) {
          return (
            <UnifiedSidebar
              workspaceType="program"
              entityId={activeProgramId}
              expanded={exp}
              onToggle={cycleSidebarState}
              selectedQuarter={selectedQuarter}
              onQuarterChange={setSelectedQuarter}
            />
          );
        }
        // Show empty state if no program selected — fill full width, no gap
        return (
          <div className="w-full h-full flex items-center justify-center p-2 text-center border-r border-border-default bg-surface-2">
            <div className="text-xs text-text-tertiary">
              <p className="font-medium">No Program</p>
            </div>
          </div>
        );

      case "project":
        if (effectiveProjectId) {
          return (
            <ProjectSidebar
              projectId={effectiveProjectId}
              projectName={effectiveProjectName}
              expanded={exp}
              onToggle={cycleSidebarState}
            />
          );
        }
        // Fallback — fill full sidebar width so no blank gap appears
        return (
          <div className="w-full h-full flex items-center justify-center p-2 text-center border-r border-border-default bg-surface-2">
            <div className="text-xs text-text-tertiary">
              <p className="font-medium">No Project</p>
            </div>
          </div>
        );

      case "enterprise":
        // Always show enterprise sidebar for enterprise routes
        return (
          <EnterpriseSidebar expanded={exp} onToggle={cycleSidebarState} />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="h-screen flex flex-col text-[var(--cp-t1)]"
      style={{ background: "var(--cp-bg-elevated)" }}
      onClickCapture={handleInternalLinkClickCapture}
    >
      {/* Skip link — WCAG AA (CG-12): keyboard users tab here first, then jump to main */}
      <a
        href="#catalyst-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-1.5 focus:rounded focus:bg-white focus:text-blue-700 focus:text-sm focus:font-medium focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Global Header */}
      <div data-catalyst-header style={{ position: "relative" }}>
        <Suspense
          fallback={
            <div
              className="h-[56px] border-b"
              style={{
                background: "var(--cp-bg)",
                borderColor: "var(--cp-bd)",
              }}
            />
          }
        >
          <CatalystHeader />
        </Suspense>
        {/* Mobile / tablet hamburger — only visible at <1024px.
            Positioned absolutely so we don't edit CatalystHeader internals.
            Sits at the far-left where the sidebar chevron normally lives. */}
        {isNarrow && (
          <button
            ref={mobileMenuTriggerRef}
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileDrawerOpen}
            aria-controls="catalyst-mobile-drawer"
            onClick={() => setMobileDrawerOpen(true)}
            style={{
              position: "absolute",
              top: "50%",
              left: 8,
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              background: "var(--ds-background-neutral-subtle, transparent)",
              border: "none",
              cursor: "pointer",
              color:
                "var(--ds-text, var(--cp-t1, var(--cp-text-primary, var(--cp-text-inverse, #172B4D))))",
              zIndex: 50,
            }}
          >
            <Menu size={20} />
          </button>
        )}
      </div>
      <HuddleFab />
      <HuddleIncoming />
      <HuddleScreenView />

      {/* Main Content with Context Panel - Conditional Sidebar Based on workspaceType */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar - GPU layer for stability.
            When sidebarHidden is true the actual sidebar is unmounted (0 DOM
            cost) and replaced with a thin edge-reveal handle that restores
            the sidebar on click. Keyboard: `[` cycles between states. */}
        <div
          id="catalyst-sidebar"
          data-catalyst-sidebar
          role="navigation"
          aria-label="Main navigation"
          aria-hidden={sidebarHidden}
          className="relative flex-shrink-0"
          // No onMouseLeave here — the document mousemove effect (lines
          // 124-156) already handles close with a 300ms grace that also
          // covers the gap between the chevron (in the header, above this
          // wrapper) and the sidebar body. A local onMouseLeave fired the
          // moment the cursor moved UP toward the chevron, collapsing the
          // peek before the chevron's own hover zone could take over, which
          // is why users saw two different widths when hovering vs clicking.
          style={{
            // Parity guarantee: hover-peek and pinned states MUST render at
            // the same 240px that SidebarBase expects when expanded=true.
            // Without this, the overlay wrapper had no explicit width and
            // was collapsing to intrinsic child width, which drifted under
            // certain routes (e.g. TeamRoomSidebar uses 220px, not 240).
            // When NOT visually open we let the child (zero-width placeholder or
            // zero-width placeholder) size itself — forcing a width here
            // would collapse the edge-reveal handle.
            // ...(sidebarVisuallyOpen ? { width: 240 } : null),
            ...(sidebarOverlayMode
              ? {
                  position: "absolute" as const,
                  top: 56, // start BELOW the 56px top nav — never covers the header
                  left: 0,
                  bottom: 0,
                  zIndex: 40,
                  boxShadow: "0 8px 24px var(--ds-shadow-raised, rgba(0,0,0,0.15))",
                }
              : {}),
            // Loop 2 (2026-04-30): hide the inline rail at <1024px. The same
            // sidebar node is rendered inside GlobalMobileDrawer below.
            // display:none keeps it out of the flex flow without affecting
            // the desktop branch when isNarrow flips back to false.
            ...(isNarrow ? { display: "none" } : null),
          }}
        >
          {sidebarVisuallyOpen ? (
            // Visible — either pinned (solid panel) or hover-peek (overlay).
            // Admin flows through here too (single-chevron contract,
            // 2026-05-17): no more isAdminRoute carve-out.
            <Suspense fallback={null}>{renderSidebar()}</Suspense>
          ) : (
            // Apr 28, 2026: the SidebarEdgeReveal handle was deprecated;
            // when the sidebar is hidden / unpinned / not peeking we
            // render a zero-width placeholder so the flex row stays
            // stable. Restoring the sidebar happens via the top-nav
            // chevron or ⌘/Ctrl + [.
            <div style={{ width: 0, height: "100%" }} aria-hidden />
          )}
        </div>

        <main
          id="catalyst-main"
          data-catalyst-main
          className="flex-1 min-w-0 w-full max-w-full flex flex-col overflow-hidden"
          style={{ background: mainBg }}
        >
          <Suspense fallback={null}>
            <AnnouncementBanner />
          </Suspense>
          <div
            className={`flex-1 min-h-0 w-full max-w-full flex flex-col ${isProjectHubAllWorkRoute || isIssueFullPageRoute || isProjectHubBacklogRoute || isChatRoute || isReleaseDetailRoute ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"}`}
          >
            <div
              className={`w-full max-w-full ${isProjectHubAllWorkRoute || isIssueFullPageRoute || isProjectHubBacklogRoute || isChatRoute || isReleaseDetailRoute ? "flex-1 min-h-0 flex flex-col overflow-hidden" : ""}`}
            >
              {shouldWrapHubSurface ? (
                /* jira-compare 2026-05-05 cycle 2 — D-4 fix · drop the LEFT
                   frame padding to 0 on AllWork (and full-page issue) so the
                   navigator/issue panel sits flush against the global
                   sidebar's vertical divider. Vikram complaint (image 6):
                   "left side padding issue empty space left for the
                   navigator railing by the vertical divider". Top/right/
                   bottom keep 24px breathing room. */
                <HubSurface
                  panelPadding={0}
                  framePadding={
                    isProjectHubDependenciesRoute
                      ? "24px 0 0 0"
                      : isProjectHubAllWorkRoute || isIssueFullPageRoute
                        ? "24px 0 24px 0"
                        : 24
                  }
                >
                  <Outlet />
                </HubSurface>
              ) : (
                <Outlet />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Loop 2 (2026-04-30) — Mobile / tablet off-canvas drawer.
          Renders the SAME sidebar node the desktop rail would render,
          but inside a portal-mounted left drawer. Inactive at ≥1024px. */}
      {isNarrow && (
        <GlobalMobileDrawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          returnFocusRef={mobileMenuTriggerRef}
        >
          <Suspense fallback={null}>{renderSidebar(true)}</Suspense>
        </GlobalMobileDrawer>
      )}

      {/* Always-on chat dock — available on every authenticated page (mounted
          here in the shell, not in FullAppRoutes which only serves catch-all
          routes). Hidden on the full-page /chat surface. Collapsed by default
          (no realtime subscriptions until opened). */}
    </div>
  );
}

function formatLastLogin(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function LastLoginFlag() {
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const val = consumeLastLoginDisplay();
    if (val) {
      setLastLoginAt(val);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 6000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  if (!visible || !lastLoginAt) return null;

  return (
    <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 9999 }}>
      <FlagGroup onDismissed={dismiss}>
        <AkFlag
          id="last-login-flag"
          appearance="info"
          icon={
            <InfoIcon
              label=""
              color={token("color.icon.information", "var(--ds-link, #0C66E4)")}
            />
          }
          title="Welcome back"
          description={`You last signed in on ${formatLastLogin(lastLoginAt)}`}
          actions={[{ content: "Dismiss", onClick: dismiss }]}
        />
      </FlagGroup>
    </div>
  );
}

/**
 * CatalystFlagStack — bottom-left Atlassian Flag stack driven by the
 * useCatalystFlagsStore. Renders nothing while the stack is empty so
 * the corner stays clear.
 */
function CatalystFlagStack() {
  const flags = useCatalystFlagsStore((s) => s.flags);
  const dismissFlag = useCatalystFlagsStore((s) => s.dismissFlag);
  if (flags.length === 0) return null;

  const iconFor = (appearance: CatalystFlagAppearance) => {
    switch (appearance) {
      case "success":
        return <SuccessIcon label="" color={token("color.icon.success", "var(--ds-background-success-bold, #1F845A)")} />;
      case "warning":
        return <WarningIcon label="" color={token("color.icon.warning", "var(--ds-text-warning, #974F0C)")} />;
      case "error":
        return <ErrorIcon label="" color={token("color.icon.danger", "var(--ds-text-danger, #AE2A19)")} />;
      case "info":
      default:
        return <InfoIcon label="" color={token("color.icon.information", "var(--ds-link, #0C66E4)")} />;
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 9999 }}>
      <FlagGroup onDismissed={(id) => dismissFlag(String(id))}>
        {flags.map((f) => (
          <AkFlag
            key={f.id}
            id={f.id}
            appearance={f.appearance === "success" || f.appearance === "info" ? "info" : f.appearance}
            icon={iconFor(f.appearance)}
            title={f.title}
            description={f.description}
            actions={f.sticky ? [{ content: "Dismiss", onClick: () => dismissFlag(f.id) }] : undefined}
          />
        ))}
      </FlagGroup>
    </div>
  );
}

export function CatalystShell() {
  const pendingItem = useGlobalSearchStore((s) => s.pendingItem);
  const clearDetail = useGlobalSearchStore((s) => s.clearDetail);

  return (
    <CatalystContextProvider>
      <CatalystShellContent />
      {/* CatalystFlagStack is mounted here intentionally — the store is
          empty by default so it renders nothing. The dashboard reply
          flow uses INLINE feedback (no overlay), but other flows that
          need a true background event signal (sync done, bulk op
          finished) can still push a Flag without prop-drilling. */}
      <CatalystFlagStack />
      {/* GlobalSearch is rendered inside CatalystHeader as the anchored search trigger */}
      {/*
       * Global CatalystDetailRouter — modal mode only. Opened from
       * GlobalSearch, Notifications, R360, etc.
       *
       * When `pendingItem.panelMode === true`, this shell SKIPS rendering
       * and the page that triggered the open (e.g. ForYouPage) is
       * responsible for mounting its own side panel inline. That matches
       * the project-hub BacklogPage pattern where the panel lives inside
       * the page's own layout and the page itself controls how its
       * content responds to the panel width.
       */}
      {pendingItem && !pendingItem.panelMode && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={clearDetail}
            itemId={pendingItem.id}
            projectId={pendingItem.projectId || ""}
            projectKey={pendingItem.projectKey || ""}
            itemType={pendingItem.itemType}
            entityKind={pendingItem.entityKind}
          />
        </Suspense>
      )}
    </CatalystContextProvider>
  );
}
