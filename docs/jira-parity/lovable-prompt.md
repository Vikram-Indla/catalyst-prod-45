# Lovable Prompt — Jira-Parity Top Nav for Catalyst

Copy-paste the block below into Lovable in one shot. It is scoped, token-safe, and Atlaskit-only. It preserves Catalyst's existing business logic (CreateDropdown content, GlobalSearch Zustand store, AdsThemeProvider) and only swaps/builds chrome.

---

## PROMPT — paste into Lovable

```
GOAL
Migrate Catalyst's top navigation, global search, left side panel, notifications, settings, profile, and AI-assistant entry to pixel-match Jira — using @atlaskit/* primitives only. Do not touch business logic or routing. Enhance the existing components; do not rebuild their data flow.

NON-NEGOTIABLES
1. Atlaskit-only for every chrome element: @atlaskit/atlassian-navigation, @atlaskit/page-layout, @atlaskit/popup, @atlaskit/menu, @atlaskit/dropdown-menu, @atlaskit/button, @atlaskit/textfield, @atlaskit/tabs, @atlaskit/toggle, @atlaskit/tooltip, @atlaskit/icon, @atlaskit/avatar, @atlaskit/tokens, @atlaskit/badge, @atlaskit/lozenge, @atlaskit/primitives. No shadcn, Radix, or Lucide in the top nav or the new dropdowns.
2. Colors/spacing/typography come from @atlaskit/tokens via the existing AdsThemeProvider at src/theme/ads/AdsThemeProvider.tsx. Never hardcode px or hex in the new components.
3. Preserve existing business logic: CreateDropdown work-item types, globalSearchStore (Zustand), user query hooks, route navigation, theme toggle keyboard shortcut if any.
4. Dark mode must work via AdsThemeProvider with no additional wiring.
5. All IconButtons must have descriptive `label` props. All popups must be keyboard-navigable with Escape to close.

FILES TO CREATE
- src/components/layout/AppSwitcher.tsx              // SOLE hub-nav surface
- src/components/layout/HubTile.tsx                  // 36×36 colored tile + white glyph for App Switcher rows
- src/components/layout/ActiveHubLabel.tsx           // breadcrumb-style "› {hub name}" next to ProductHome
- src/components/layout/AskCatalystPill.tsx
- src/components/layout/SettingsMenu.tsx
- src/components/layout/ProfileMenu.tsx
- src/components/layout/dropdowns/NotificationItem.tsx
- src/components/layout/dropdowns/NotificationList.tsx
- src/lib/hubs.ts                                    // SSOT hub list: name, route, tile color token, glyph, matcher
- src/hooks/useCommandK.ts                           // global ⌘K binding
- src/hooks/useSidebarCollapsed.ts                   // persist to localStorage
- src/hooks/useNotifications.ts                      // React Query hook backed by Atlassian Jira data
- src/lib/atlassian/mapJiraEventToNotification.ts    // transform Jira issue/comment events into NotificationItem shape

DO NOT create:
- src/components/layout/HelpMenu.tsx             // Help icon is intentionally skipped — no Help button in top nav

FILES TO REFACTOR (do not rewrite from scratch)
- src/components/ja/CatalystHeader.tsx         // wrap in @atlaskit/atlassian-navigation AtlassianNavigation; keep hub-tab row as a second row below it
- src/components/layout/CatalystShell.tsx      // wrap layout in @atlaskit/page-layout PageLayout + LeftSidebar + Main
- src/components/layout/dropdowns/CreateDropdown.tsx   // wrap trigger in @atlaskit/button Button appearance=primary + @atlaskit/popup; keep existing MenuGroup items
- src/components/global-search/GlobalSearch.tsx // replace Radix Dialog with @atlaskit/popup anchored to @atlaskit/textfield; keep Zustand store + work-type icons
- src/components/layout/dropdowns/NotificationsPanel.tsx   // rebuild body with @atlaskit/tabs + @atlaskit/toggle + @atlaskit/menu + inline reactions + rollups
- src/components/layout/SidebarBase.tsx        // wrap in @atlaskit/side-navigation SideNavigation; icon-only mode when collapsed

TOP-NAV STRUCTURE (AtlassianNavigation props)
<AtlassianNavigation
  label="Catalyst top navigation"
  renderAppSwitcher={() => <AppSwitcher />}
  renderProductHome={() => (
    <ProductHome
      href="/"
      icon={() => <img src="/catalyst-mark.svg" width={24} height={24} alt="" />}
      logo={() => <img src="/catalyst-wordmark.svg" height={20} alt="Catalyst" />}
      siteTitle="Catalyst"
    />
  )}
  renderCreate={() => <CreateDropdown />}
  renderSearch={() => <GlobalSearch />}
  // renderHelp is intentionally omitted — Help icon is skipped in this phase
  renderNotifications={() => <NotificationsPanel />}
  renderSettings={() => <SettingsMenu />}
  renderProfile={() => <ProfileMenu />}
  primaryItems={[]}  // keep Catalyst's hub-tab row as its own second row directly below
/>

DELETE the current row of 9 hub tabs in CatalystHeader.tsx entirely. Hub navigation now lives ONLY inside the AppSwitcher dropdown (see below). Do not render a second row under AtlassianNavigation. Pass primaryItems={[]} to AtlassianNavigation.

Next to ProductHome (right of the Catalyst wordmark), render a breadcrumb-style active-hub label: "› {Current Hub Name}" where the current hub is derived from useLocation() and matched against the hub→route map in src/lib/hubs.ts. Use text size="medium", color.text.subtle, weight 400. This mirrors Jira's instance-label pattern.

To the LEFT of "+ Create" (between ProductHome and Create), render <AskCatalystPill /> — a rounded pill with an AI icon and label "Ask Catalyst". Style with @atlaskit/primitives (Pressable + Flex + Box) using tokens (color.border, color.background.input, space.100). Clicking opens a placeholder modal via @atlaskit/modal-dialog: "Ask Catalyst AI — coming soon".

LEFT SIDEBAR (LeftSidebar from @atlaskit/page-layout)
- Wrap existing SidebarBase.tsx in <LeftSidebar> from @atlaskit/page-layout
- Default width 240px, collapsed width 64px
- Toggle button: @atlaskit/button IconButton with ChevronLeftIcon / ChevronRightIcon at sidebar top-right
- When collapsed, ALL existing sidebar items render in icon-only mode (hide labels, keep icons + Star favorites). NO items disappear.
- Persist collapsed state to localStorage("cp.sidebar.expanded") via useSidebarCollapsed
- Animation 250ms ease-out (Atlaskit default — no custom CSS)

APP SWITCHER (src/components/layout/AppSwitcher.tsx) — SOLE HUB NAV SURFACE
This is the ONLY place users switch hubs. The hub-tab row is deleted from the top nav. Design matches Jira's App Switcher dropdown pixel-for-pixel.

- Trigger: @atlaskit/button IconButton
  - Icon: @atlaskit/icon-lab AppSwitcherIcon if available; else inline SVG 2×2 grid of rounded 6×6 squares with 2px gap (16×16 viewBox) — matches Jira's switcher glyph
  - Tooltip (@atlaskit/tooltip position="bottom"): "Switch hubs"
  - label="Switch hubs"
- Popup: @atlaskit/popup placement="bottom-start", width 360px, max-height 640px, overflow-y auto

Popup contents top-to-bottom:

1. INSTANCE HEADER (padding space.200)
   - Left: 36×36 square tile (border-radius 6px) with 2-letter tenant initials, background color.background.accent.green.subtler, initials in @atlaskit/heading size="xsmall" weight 700, center-aligned
   - Middle: tenant display name (e.g. "MIM Catalyst Instance") in @atlaskit/heading size="small" weight 600
   - Right: ChevronDownIcon in IconButton, aria-disabled=true, visual only — instance switching is out of scope
   - Border-bottom 1px color.border

2. "YOUR HUBS" SECTION — 9 rows, each a @atlaskit/menu LinkItem
   Each row uses a colored-tile iconBefore:
   - Tile: 36×36 rounded 6px box with 18×18 white glyph centered
   - Row label: 14px weight 500 color.text
   - Hover: background color.background.neutral.subtle.hovered
   - Active route: background color.background.selected, 3px left rail color.border.selected

   The 9 hubs (order matters — match Catalyst's current tab order):
   | # | Hub name           | Tile bg token                          | Glyph (@atlaskit/icon or fallback) | Route       |
   | 1 | Enterprise Hub     | color.background.accent.purple.bold    | BuildingIcon (or inline SVG)       | /enterprise |
   | 2 | Product Room       | color.background.accent.blue.bold      | Diamond-shield SVG                 | /product    |
   | 3 | Project            | color.background.accent.teal.bold      | FolderWithCheckIcon                | /project    |
   | 4 | Release            | color.background.accent.orange.bold    | RocketIcon                         | /release    |
   | 5 | Test               | color.background.accent.green.bold     | ChecklistIcon                      | /test       |
   | 6 | Incident           | color.background.accent.red.bold       | AlertTriangleIcon                  | /incident   |
   | 7 | Task               | color.background.accent.yellow.bold    | CheckCircleIcon                    | /task       |
   | 8 | Plan               | color.background.accent.magenta.bold   | CalendarIcon                       | /plan       |
   | 9 | Wiki               | color.background.accent.lime.bold      | BookIcon                           | /wiki       |

   All glyphs render at 18×18 centered, color color.icon.inverse (white).
   Clicking a row: useNavigate() to the route, close the popup, emit analytics event "app_switcher.hub_selected" (optional).

3. DIVIDER — 1px color.border, full width

4. FOOTER (padding space.150)
   - @atlaskit/button appearance="subtle" full-width: "Manage hubs" → /admin/hubs (visible only if user.role === 'admin')

Store the hub→route→tile→icon map in a new file src/lib/hubs.ts as a typed array Hub[]. AppSwitcher, the breadcrumb-hub-label next to ProductHome, and the sidebar all read from this single source of truth.

DO NOT render "Recommended for your team" / "More Atlassian apps" sections — those are Jira-specific cross-product suggestions; Catalyst doesn't have equivalents yet. Skip entirely.

Keyboard: @atlaskit/menu handles arrow keys natively. Escape closes and returns focus to the 8×8 trigger button.

GLOBAL SEARCH (refactor GlobalSearch.tsx)
- Trigger inside AtlassianNavigation renderSearch: @atlaskit/textfield Textfield with elemBeforeInput=<SearchIcon />, placeholder="Search", onFocus opens the popup
- Replace Radix Dialog with @atlaskit/popup, placement="bottom", width matching trigger (~640px)
- Popup contents in order:
  1. Filter chip row: exactly two chips — "Projects" and "Assignee" (drop the Jira "App" filter). Each chip is @atlaskit/dropdown-menu DropdownMenu with a chevron; selecting values filters the recent-items list below.
  2. Recent query row: clock icon + last searched string + right-aligned "Recent search" subtext
  3. RECENT section heading: @atlaskit/heading size="xsmall", color.text.subtlest
  4. Recent items: @atlaskit/menu LinkItem with iconBefore=work-type icon (bug/task/story/epic/subtask/incident — reuse existing icons from globalSearchStore), description="{projectName} · {workType} · {space}", elemAfter="You viewed {time ago}"
  5. Footer rows (at bottom):
     - @atlaskit/menu ButtonItem "Search Catalyst for work items" with iconBefore=<SearchIcon /> and elemAfter=<Kbd>↵</Kbd>
     - @atlaskit/menu ButtonItem "Search all apps" with iconBefore=<SearchIcon /> and elemAfter=<><AppIconStrip /><Kbd>⌘</Kbd><Kbd>↵</Kbd></>
  6. Feedback footer: "Help us improve search · Give feedback" link, @atlaskit/heading size smallest, color.text.subtlest
- Keyboard:
  - useCommandK hook listens for mod+k on document; dispatches existing CustomEvent "open-global-search" and focuses the textfield
  - ↑/↓ navigate result rows (native @atlaskit/menu keyboard behavior)
  - Enter on "Search Catalyst for work items" executes search
  - ⌘+Enter on "Search all apps" executes search across apps
  - Escape closes popup

NOTIFICATIONS PANEL (refactor NotificationsPanel.tsx)
- DATA SOURCE: Atlassian (Jira) — NO MOCK DATA. Use the useNotifications() hook (new file src/hooks/useNotifications.ts) which calls the connected Atlassian MCP to pull recent issue changelog events, comment events, mentions, and assignments for the current user. Transform each event into a NotificationItem via src/lib/atlassian/mapJiraEventToNotification.ts.
- Jira → NotificationItem field mapping:
  - actor.name / avatarUrl ← changelog.author or comment.author
  - action ← derived string: "updated a story" | "assigned a work item to you" | "mentioned you in a comment" (depending on event type)
  - timestamp ← changelog.created or comment.created
  - workItem.key ← issue.key (e.g. BAU-5563)
  - workItem.type ← issue.fields.issuetype.name
  - workItem.summary ← issue.fields.summary
  - workItem.status ← issue.fields.status.name
  - unread ← changelog.created > user.lastSeenNotificationsAt (persisted in Supabase user_prefs)
  - comment.text ← comment.body (strip Atlassian Document Format to plain text)
  - comment.link ← `https://digital-transformation.atlassian.net/browse/${issue.key}?focusedCommentId=${comment.id}`
  - comment.reactions ← comment.reactions if available; else hide reaction bar
  - rollup.count ← count of events from same actor on same issue in last 24h when > 1
- Tab filters:
  - Direct tab = events where currentUser is assignee OR mentioned in comment
  - Watching tab = events on issues where issue.fields.watches.isWatching === true
- Polling: React Query refetchInterval 60_000 (60s). Add placeholder "refresh" IconButton in header.
- Trigger: bell IconButton with @atlaskit/badge Badge appearance="important" overlay in top-right showing unread count from useNotifications().unreadCount (render "9+" when count >= 10). The badge needs aria-label="{count} unread notifications".
- Popup: @atlaskit/popup placement="bottom-end", width=400px, max-height=640px, overflow-y=auto
- Header row (padding space.200, flex space-between):
  - Left: @atlaskit/heading size="medium" "Notifications"
  - Right: "Only show unread" label + @atlaskit/toggle Toggle + IconButton (open in full view) + IconButton (more options)
- @atlaskit/tabs Tabs with two tabs: "Direct" | "Watching"
- Each tab panel: grouped NotificationList
  - Group headings: "Today", "Yesterday", "Earlier" — @atlaskit/heading size="xsmall", color.text.subtlest
  - NotificationItem anatomy:
    - 32px @atlaskit/avatar on left
    - Title: **{actor}** {action} + timestamp (e.g. "2 hours ago") in color.text.subtlest
    - Work item ref line: {work-type icon} {summary in one line, ellipsis}
    - Status line: {BAU-KEY} · {status} — use @atlaskit/lozenge for status if color-coded, otherwise plain text
    - Right-aligned: 6px blue unread dot when unread
  - If notification is a rollup: render a second nested row with small avatar + "+N updates from {actor}" as a link in color.link
  - If notification is a comment mention (item.comment is set):
    - Below status line, render a quote block with comment.text (border-l 2px color.border, padding-left space.150, italic-less)
    - Below quote: reaction bar — emoji buttons 👍 👏 🔥 ❤️ + "add reaction" IconButton (use @atlaskit/button IconButton with emoji-strip children; or inline SVG for emojis)
    - Row below reactions: "Reply" secondary button + "View thread" link (color.link)
- Clicking a notification navigates to the work item via useNavigate and marks it read

SETTINGS MENU (new src/components/layout/SettingsMenu.tsx)
- Trigger: gear IconButton
- Popup: @atlaskit/popup placement="bottom-end", width=400px
- Top: @atlaskit/textfield compact with placeholder "Search (⌘ + K)" and elemBeforeInput=<SearchIcon />. Client-side filter the visible rows below by label substring.
- Section 1 "Personal Catalyst settings" (heading + two LinkItems):
  - General settings — icon=<PersonIcon />, description="Manage language, time zone, and other personal preferences", href=/settings/general
  - Notification settings — icon=<NotificationIcon />, description="Manage email and in-app notifications from Catalyst", href=/settings/notifications
- Section 2 "Catalyst admin settings" (heading + one LinkItem, ONLY rendered if user.role === 'admin'):
  - Work items — icon=<WorkItemIcon />, description="Configure work types, workflows, screens, fields, and more", href=/admin/work-items
- Do NOT render: System, Apps, Spaces, Marketplace apps, User management, Billing. These are out of scope.

PROFILE MENU (new src/components/layout/ProfileMenu.tsx)
- Trigger: IconButton with Avatar (size="small", src=user.avatarUrl)
- Popup: @atlaskit/popup placement="bottom-end", width=320px
- Header card (padding space.200, background color.background.neutral.subtle):
  - Large avatar + Stack(name: @atlaskit/heading size="small", email: text size="small" color.text.subtlest)
- MenuGroup 1:
  - LinkItem iconBefore=<PersonIcon /> "Profile" → /profile
  - LinkItem iconBefore=<SettingsIcon /> "Account settings" → /settings
  - NestingItem iconBefore=<ThemeIcon /> title="Theme" with children:
    - ButtonItem "Light" → setTheme('light')
    - ButtonItem "Dark" → setTheme('dark')
    - ButtonItem "Match system" → setTheme('system')
  - LinkItem iconBefore=<OpenIcon /> "Open Quickstart" → /quickstart
- MenuGroup 2 "Upgrade":
  - LinkItem elemAfter=<Lozenge appearance="new">FREE 30-DAY TRIAL</Lozenge> "Try the Premium plan" → /upgrade
- MenuGroup 3:
  - LinkItem iconBefore=<SlackIcon /> "Slack" → /integrations/slack
- MenuGroup 4:
  - ButtonItem iconBefore=<SwitchIcon /> "Switch account" → supabase switch
  - ButtonItem iconBefore=<LogoutIcon /> "Log out" → supabase.auth.signOut + navigate /login

Remove the existing top-nav Sun/Moon theme toggle. Theme is now only in ProfileMenu → Theme submenu. If there was a keyboard shortcut for theme toggle, keep it and trigger setTheme directly.

ASK CATALYST PILL (new src/components/layout/AskCatalystPill.tsx)
- VISUAL-ONLY — NO CLICK HANDLER, NO MODAL
- Use @atlaskit/primitives Box (not Pressable — it must be non-interactive)
- Render as a <div role="presentation"> with aria-disabled="true"
- Visual: rounded 8px pill, border 1px color.border, background color.background.input, padding space.100, gap space.100
- Left: 16px AI sparkle icon (inline SVG using color.icon.accent.blue)
- Text: "Ask Catalyst" at text size="small" weight 500
- Reduced opacity 0.7, cursor: not-allowed
- No onClick, no tabindex, no modal. This is purely a visual-parity placeholder.

ACCESSIBILITY
- Every IconButton: descriptive `label` prop (screen reader will announce)
- Badge on notifications bell: aria-label="{N} unread notifications"
- All popups: Escape closes, focus trap active, focus returns to trigger on close (@atlaskit/popup does this automatically)
- Keyboard order: SidebarToggle → AppSwitcher → ProductHome → AskCatalystPill → Create → Search → Notifications → Help → Settings → Profile
- Do NOT override outline; do NOT add tabindex="-1" anywhere
- Unread dot on notification items: aria-hidden="true" (the unread state is conveyed by bold typography)

TYPOGRAPHY
- All text uses @atlaskit/heading and @atlaskit/primitives Text — never raw <h1>..<p> with custom font sizes
- Font sizes are set by Atlaskit component variants; do not pass style={{ fontSize }}

SPACING
- All spacing uses token("space.050"|"100"|"150"|"200"|"300"|"400"|"500"|"600"|"700")
- No px/rem literals in the new components

DO NOT
- Do not add new dependencies unless explicitly listed above
- Do not touch src/theme/ads/tokens.ts or AdsThemeProvider.tsx
- Do not change routing or URLs
- REMOVE Catalyst's hub-tab row (the row of 9 hub tabs) from CatalystHeader.tsx entirely. Hub switching moves to the App Switcher dropdown only. Do not render any second row below AtlassianNavigation.
- Do not implement: App filter in search, Quick-nav chips (Boards/Spaces/Filters/Plans/Teams), System/Apps/Spaces/Marketplace admin, User management, Billing, Help menu, real AI backend
- Do not render a Help icon/menu in the top nav under any circumstances — it is explicitly skipped for this phase
- Do not wire a click handler or modal to AskCatalystPill — it is visual-only
- Do not use mock data for notifications — wire to real Atlassian MCP via useNotifications()
- Do not replace Lucide icons outside the top-nav/dropdown components touched here

ACCEPTANCE CRITERIA
- Top nav renders via @atlaskit/atlassian-navigation with no Radix/Lucide/shadcn in the header tree (except inside Catalyst's hub-tab row, which is unchanged)
- Clicking App Switcher shows the hubs dropdown
- Clicking Create shows the existing CreateDropdown items in an Atlaskit popup
- ⌘K from anywhere in the app opens global search and focuses the textfield
- Global search shows Projects + Assignee filter chips, recent query, recent items, two footer rows, feedback link
- Clicking the bell shows the Notifications popup with Direct/Watching tabs, unread toggle, and list items with correct anatomy (including reactions + Reply + View thread where applicable, and +N update rollups)
- Clicking the gear shows Settings with ⌘K search, Personal settings, and Work items (admin-gated)
- Clicking the avatar shows Profile menu with user card header, theme submenu, and log out wired to Supabase
- Ask Catalyst pill opens the coming-soon modal
- Sidebar collapse button toggles between 240px labeled and 64px icon-only; all items visible in both modes; state persists across reloads
- Dark mode works everywhere with no manual theme rewiring
- No console errors; no Atlaskit theme warnings

DELIVERABLE
A single PR titled "feat(nav): Jira-parity top nav + left sidebar via Atlaskit" containing:
- All file creates and refactors above
- Screenshot diff: Catalyst top nav before/after at light + dark
- Brief CHANGELOG entry listing the new dropdowns and the removed Sun/Moon toggle
```

---

## Notes for the human running this

1. Paste the prompt into Lovable verbatim. Do not add "please" or conversational framing — Lovable produces better code from imperative specs.
2. If Lovable complains about a missing Atlaskit subpackage, add it to `package.json`. The packages already installed are in the preflight; the new ones likely needed are `@atlaskit/atlassian-navigation`, `@atlaskit/tabs`, `@atlaskit/toggle`, `@atlaskit/side-navigation`, `@atlaskit/menu`, `@atlaskit/badge`, `@atlaskit/lozenge`, `@atlaskit/heading`, `@atlaskit/primitives`, `@atlaskit/icon-lab` (optional).
3. After Lovable ships: run the verify step in `jira-parity-plan.md` §8 — screenshot Catalyst top nav + each menu open, overlay against the 6 reference images, flag any drift >2px.
4. Before you kick off Lovable: answer the 4 open questions in `jira-parity-plan.md` §9 (Help menu, hub-tab row, Ask Catalyst backend, Notifications data source). The prompt above assumes Help is skipped; un-comment the `renderHelp` line if you want it.
