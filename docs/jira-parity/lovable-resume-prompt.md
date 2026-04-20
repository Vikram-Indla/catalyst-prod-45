# Lovable RESUME Prompt — Wire the new Atlaskit chrome

Paste this into the same Lovable session (it has context from phase 1). It is scoped to finish the migration cleanly without rebuilding what's already done.

---

## PROMPT — paste into Lovable

```
CONTEXT
You already created these new files in phase 1 and paused before wiring:
- src/lib/hubs.ts
- src/components/layout/HubTile.tsx
- src/components/layout/ActiveHubLabel.tsx
- src/components/layout/AskCatalystPill.tsx
- src/components/layout/AppSwitcher.tsx
- src/components/layout/SettingsMenu.tsx
- src/components/layout/ProfileMenu.tsx
- src/hooks/useCommandK.ts
- src/hooks/useSidebarCollapsed.ts
- src/lib/atlassian/mapJiraEventToNotification.ts

PHASE 2 GOAL
Fix defects in the phase-1 files, create the missing useNotifications hook, and wire everything into CatalystHeader, CatalystShell, SidebarBase, GlobalSearch, CreateDropdown, and NotificationsPanel. Do NOT rewrite working business logic — only swap chrome.

PHASE 2 ORDER OF OPERATIONS — follow this strictly so build stays green after each step:

STEP 1 — Audit & fix defects in phase-1 files
1a. Check src/lib/hubs.ts: every HUBS[i].glyph must return a valid ReactNode (e.g. `() => <OfficeBuildingIcon label="" />`). If any entry is still an empty placeholder (`glyph: (label) =>`), fill it in. Confirm tsc --noEmit passes for this file.
1b. Check src/components/layout/HubTile.tsx: xcss DOES NOT accept dynamic token strings. Refactor so backgroundColor is applied via a static xcss style keyed off a bounded union ('purple'|'blue'|'teal'|'orange'|'green'|'red'|'yellow'|'magenta'|'lime'). Export the union as HubColor and change HUBS[i].tileColor to that union. Map the union inside HubTile to a STATIC xcss per color, e.g.:
    const tileStyles = {
      purple: xcss({ backgroundColor: 'color.background.accent.purple.bolder', color: 'color.text.inverse' }),
      blue: xcss({ backgroundColor: 'color.background.accent.blue.bolder', color: 'color.text.inverse' }),
      // ...one per color
    } as const;
    <Box xcss={tileStyles[color]} ...>
1c. Check AppSwitcher popup width: should be 360px not 128px. Use xcss `width: '360px'` (literal) or a custom container <div style={{width: 360}}> since 'size.1000' is ~128px.
1d. Confirm SettingsMenu and ProfileMenu popup widths render correctly (360px for Settings, 320px for Profile) using the same approach.
1e. Confirm all icon imports resolve — if @atlaskit/icon/glyph/<name> isn't available, substitute a valid alternative or inline SVG.

STEP 2 — Create src/hooks/useNotifications.ts (NEW — was missing)
Wire real Atlassian Jira data via the connected MCP. Signature:
    export interface Notification {
      id: string;
      type: 'assignment' | 'mention' | 'comment' | 'status_change';
      actor: { full_name: string; avatar_url: string | null } | null;
      title: string;
      message: string;
      entity_type: string | null;
      severity: 'low' | 'medium' | 'high' | 'critical';
      is_read: boolean;
      created_at: string;
      link: string | null;
    }

    export function useNotifications(tab: 'direct' | 'watching') {
      return useQuery({
        queryKey: ['notifications', tab],
        queryFn: async () => {
          // Call the Atlassian MCP. The Jira instance is https://digital-transformation.atlassian.net.
          // Use JQL to fetch recent activity:
          //   Direct tab: assignee = currentUser() OR comment ~ currentUser() ORDER BY updated DESC
          //   Watching tab: watcher = currentUser() ORDER BY updated DESC
          // For each issue, pull changelog entries from the last 7 days.
          // Map each (issue, changelog-entry) pair into a Notification via mapJiraEventToNotification.
          // If the MCP client isn't available in-browser, expose a Supabase edge function `atlassian-notifications` that the browser calls. Create it at supabase/functions/atlassian-notifications/index.ts using the Atlassian REST API with a service token stored in Supabase secrets.
          const response = await fetch(`/api/atlassian-notifications?tab=${tab}`);
          return response.json() as Promise<Notification[]>;
        },
        refetchInterval: 60_000,
        staleTime: 30_000,
      });
    }

    export function useUnreadNotificationCount() {
      const direct = useNotifications('direct');
      const watching = useNotifications('watching');
      const all = [...(direct.data ?? []), ...(watching.data ?? [])];
      return all.filter((n) => !n.is_read).length;
    }

If Supabase edge functions aren't configured, fall back to returning [] and log a clear console warning: "Atlassian MCP not configured — notifications disabled." Do NOT use mock data. The panel should show an empty state ("You're all caught up") in that case.

STEP 3 — Add NotificationsPanel refactor
File: src/components/layout/dropdowns/NotificationsPanel.tsx
Replace the current popover body with:
- @atlaskit/popup (keep trigger as bell IconButton)
- @atlaskit/tabs: Direct | Watching
- "Only show unread" @atlaskit/toggle in header
- Group notifications by day: Today / Yesterday / Earlier (use date-fns or Intl.RelativeTimeFormat)
- For each notification render NotificationItem.tsx (new file) with anatomy:
    avatar — actor + action + timestamp — workItem ref+type icon — status — optional quote block + reactions + Reply/View thread — optional +N updates rollup — unread blue dot
- Pull data via useNotifications(tab). Show skeleton loaders via @atlaskit/menu SkeletonItem while loading.
- Bell badge: render @atlaskit/badge appearance="important" overlay with useUnreadNotificationCount(). Show "9+" when >= 10.

STEP 4 — Refactor GlobalSearch.tsx
- Replace Radix Dialog with @atlaskit/popup anchored to a @atlaskit/textfield Textfield in the top nav
- KEEP the Zustand globalSearchStore — just swap the chrome
- Popup contents (scope-locked):
  1. Filter chips row: @atlaskit/dropdown-menu for "Projects" and "Assignee" only (DROP "App" filter)
  2. Recent query row (clock icon + last query text)
  3. RECENT section: @atlaskit/heading size="xsmall"; LinkItem rows with existing work-type icons from globalSearchStore
  4. Footer rows: "Search Catalyst for work items" (Enter) and "Search all apps" (⌘+Enter) as ButtonItem
  5. Help footer link
- Add keyboard hints (render ↵ and ⌘↵ as @atlaskit/primitives kbd-styled Text or custom span)
- DO NOT render: App filter, Boards/Spaces/Filters/Plans/Teams quick-nav chips

STEP 5 — Wrap CreateDropdown trigger
- Keep existing content (the 20+ work-item types grouped by Work Items and Other Items)
- Replace the current Radix/custom trigger with @atlaskit/button Button appearance="primary" iconBefore={<AddIcon label="" />} wrapped in @atlaskit/popup
- The popup content is @atlaskit/menu MenuGroup with Section titles "Work Items" and "Other Items"; each row a ButtonItem or LinkItem with the existing icon and onClick navigate()

STEP 6 — Wrap SidebarBase in @atlaskit/side-navigation
- Import SideNavigation, NavigationContent, ButtonItem, LinkItem, HeadingItem, Section from @atlaskit/side-navigation
- Add a collapsed mode using useSidebarCollapsed() — when collapsed, items render iconBefore only (no label). Labels return when expanded.
- Persist state to localStorage via useSidebarCollapsed
- Keep all existing hub-specific sidebars (EnterpriseSidebar, ProductRoomSidebar, etc.) wired — they should wrap their content in SideNavigation/NavigationContent/Section. No hub content changes — only chrome.

STEP 7 — Wrap CatalystShell in @atlaskit/page-layout
- Import PageLayout, Main, LeftSidebar from @atlaskit/page-layout
- Structure:
    <PageLayout>
      <Banner /> {/* optional, keep existing if any */}
      <TopNavigation isFixed><CatalystHeader /></TopNavigation>
      <LeftSidebar isFixed width={expanded ? 240 : 64} onResize={...}>
        <SidebarBase />
      </LeftSidebar>
      <Main><Outlet /></Main>
    </PageLayout>
- Top nav height 56px (default)

STEP 8 — REWRITE CatalystHeader.tsx to use @atlaskit/atlassian-navigation
- Import AtlassianNavigation, ProductHome from @atlaskit/atlassian-navigation
- Structure (exact):
    <AtlassianNavigation
      label="Catalyst top navigation"
      primaryItems={[]}  // empty — hubs moved to AppSwitcher
      renderAppSwitcher={() => <AppSwitcher />}
      renderProductHome={() => (
        <Flex gap="space.100" align="center">
          <ProductHome
            href="/"
            icon={() => <img src="/catalyst-mark.svg" width={24} height={24} alt="" />}
            logo={() => <img src="/catalyst-wordmark.svg" height={20} alt="Catalyst" />}
            siteTitle="Catalyst"
          />
          <ActiveHubLabel />
        </Flex>
      )}
      renderCreate={() => <CreateDropdown />}
      renderSearch={() => <GlobalSearch />}
      renderNotifications={() => <NotificationsPanel />}
      renderSettings={() => <SettingsMenu />}
      renderProfile={() => <ProfileMenu name={user?.name} email={user?.email} avatarUrl={user?.avatarUrl} />}
    />
- DELETE: the 9 hub-tab row, the Sun/Moon theme toggle button, any inline search input (all of these are superseded by AppSwitcher / ProfileMenu Theme submenu / GlobalSearch)
- Insert <AskCatalystPill /> between ProductHome block and Create button. Since AtlassianNavigation doesn't have a renderAskRovo slot, put it inside renderProductHome's Flex as a trailing item, OR use primaryItems for a single item, OR add it via a custom middle slot. Keep visual position similar to Jira (just left of the search field).

STEP 9 — Register useCommandK at app root
- In src/App.tsx (or wherever the ThemeProvider / QueryClientProvider live), add: useCommandK();
- Verify pressing ⌘K anywhere (except inside inputs with data-command-k-ignore="true") opens GlobalSearch

STEP 10 — Install missing packages if any
- Check package.json. If missing, add: @atlaskit/atlassian-navigation, @atlaskit/tabs, @atlaskit/toggle, @atlaskit/side-navigation, @atlaskit/menu, @atlaskit/badge, @atlaskit/lozenge, @atlaskit/heading
- Run build. Fix any TypeScript/import errors before declaring done.

STEP 11 — Build validation
- Run `pnpm build` (or the configured build command). Fix every error.
- Hit localhost:8080 in a browser. Visually verify:
  - 8×8 (2×2) AppSwitcher opens the 9-hub dropdown with colored tiles
  - No hub-tab row under the top nav
  - Breadcrumb "› {hub name}" shows next to Catalyst wordmark
  - + Create opens the existing types grouped correctly
  - ⌘K opens Global Search popup with Projects + Assignee filters only
  - Bell shows badge if useUnreadNotificationCount > 0; clicking opens Direct/Watching tabs
  - Gear opens Settings with General, Notifications, Work items (admin only)
  - Avatar opens Profile with user card, Theme submenu (replacing top-nav moon toggle), Log out working
  - Ask Catalyst pill renders disabled, no click behavior
  - Dark mode works across all new components (toggle via Profile → Theme → Dark)
  - Sidebar collapse toggle works, state persists across reload

STEP 12 — Commit
- Title: feat(nav): wire Jira-parity top nav + AppSwitcher as sole hub nav
- Description: lists the 10 phase-1 files, the 6 phase-2 files refactored, and the new useNotifications hook wiring

DO NOT (reiterated)
- Do not re-create any phase-1 file from scratch; only fix defects in place
- Do not use mock notification data; if Atlassian MCP isn't configured, render the empty state
- Do not render a Help menu (icon or dropdown)
- Do not wire a click handler to AskCatalystPill
- Do not render the deprecated hub-tab row
- Do not touch src/theme/ads/*
- Do not change routes or URLs

ACCEPTANCE CRITERIA (must all be true to declare done)
- pnpm build passes with 0 errors
- No console errors in browser at localhost:8080
- Visual checklist in STEP 11 is green
- Only @atlaskit/* components in the top nav (no Lucide, no shadcn, no Radix directly — except as transitive deps of Atlaskit)
- Dark mode works in all new surfaces
- ⌘K opens search
- Sidebar collapse persists across reload
- Notifications bell shows real-or-empty data (never mock)
```

---

## For Vikram (the human)

**Current state on your local disk:** Nothing has changed yet. Lovable's phase-1 files exist only on Lovable's side. Once Lovable finishes phase 2 and pushes to the repo, pull via GitHub Desktop to see them all at once.

**Why Lovable likely paused:** The mangled output in the paste suggests the transmission hit an issue mid-step. The helper modules are there but the wiring (which touches 6+ existing files) would have been the risky half of the job — pausing before wiring keeps your current build green.

**Recommended next step:** Paste the block above into the same Lovable session to resume. If you want me to just write the wiring in the local repo instead (I have file + bash access), say the word and I'll take the remaining 12 steps on.
