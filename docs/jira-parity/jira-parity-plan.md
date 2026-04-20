# Catalyst ↔ Jira Top-Nav Parity Plan

**Scope:** Replicate Jira's top navigation bar, global search, left side panel, notifications, settings, profile, and AI assistant entry on Catalyst — pixel-for-pixel, using **Atlaskit primitives only**.

**Reference surfaces (Jira):** 6 screenshots covering top nav, app switcher icon, sidebar toggle icon, search dropdown, notifications panel, settings menu, profile menu.

**User-confirmed implementation scope:**

| Area | In scope | Out of scope |
|---|---|---|
| Search | Recent searches + Recent items · `Search work items` + `Search all apps` footer rows · Filter chips: **Projects (Space)** + **Assignee** only | `App` filter · Quick-nav chips (Boards/Spaces/Filters/Plans/Teams) |
| Notifications | Direct / Watching tabs · Only-show-unread toggle · Notification list items (avatar, title, ref, status) · Inline reactions + Reply + View thread · `+N updates from [user]` rollups | Notification preferences sub-screen |
| Settings | Personal settings (General + Notifications) · `⌘K` search bar at top of menu · Product admin: **Work items only** | System / Apps / Spaces / Marketplace / Atlassian admin / external links |
| Profile | Full menu (Profile, Account settings, Theme, Quickstart, Upgrade placeholder, Slack, Switch account, Log out) | Slack integration plumbing (UI entry only) |
| AI assistant | Rebranded as **"Ask Catalyst"** pill — same visual treatment as Rovo | Actual AI backend (stub for now) |
| App switcher (8×8) | Icon + dropdown listing Catalyst hubs/products | Cross-product switching to non-Catalyst apps |
| Create | Already exists in Catalyst (`CreateDropdown.tsx`) — wrap in Atlaskit shell | No new work-item types |

---

## 1. Overall Impression

Catalyst's top nav today is a **custom React component** (`CatalystHeader.tsx`) using Lucide icons + Radix/shadcn. It renders 9 hub tabs, a `+ Create` dropdown, search input (⌘K hint), notifications bell, settings gear (stub), theme toggle, and user avatar. It's functional but visually drifts from Jira: the hub-tab row is unique to Catalyst (Jira puts hub switching in the left sidebar), icon weights/sizes vary, the search is a modal not an inline popover, and several menus are missing (Settings, Help, AI, App switcher, Profile dropdown).

**Biggest opportunity:** Atlaskit infrastructure is already in place (`@atlaskit/page-layout`, `@atlaskit/tokens`, `AdsThemeProvider`). The migration is largely a **component-substitution exercise**, not a rebuild. Token theming, dark mode, and layout scaffolding are already correct — we only need to swap custom chrome for Atlaskit primitives and fill in the missing menus.

---

## 2. Usability

| Finding | Severity | Recommendation |
|---|---|---|
| Search is a modal dialog; Jira uses an inline popover anchored to the search field. Modal steals focus and feels heavier than Jira. | 🟡 Moderate | Replace `@atlaskit/modal-dialog` trigger with `@atlaskit/popup` anchored to the search `TextField`. Keep ⌘K trigger. |
| Settings gear is a non-functional stub. Users reach settings only via route links. | 🔴 Critical | Wire `@atlaskit/dropdown-menu` with Personal / Product admin sections (see §5). |
| No Profile dropdown below the avatar — only a tooltip. Users can't sign out without navigating to a route. | 🔴 Critical | Add profile dropdown per Jira pattern with avatar header card. |
| Help icon missing entirely. | 🟡 Moderate | Add `@atlaskit/icon` Help icon with stub dropdown (docs / keyboard shortcuts / support). Not in user's locked scope but unavoidable for parity — ask user below. |
| Notifications panel is mock data; no Direct/Watching tabs, no reactions, no rollup threading. | 🔴 Critical | Rebuild with `@atlaskit/tabs` + `@atlaskit/menu` inside `@atlaskit/popup`. |
| 9 hub tabs in the top nav conflict with Jira's pattern (Jira puts products in the sidebar, not top nav). | 🟡 Moderate | **Preserve Catalyst's hub-tab row for now** — it's a product-unique pattern the user hasn't asked to remove. Keep it below the Atlaskit top-nav row as a second row, or migrate hub switching into the left sidebar in a later phase. Flag for the user. |
| Theme toggle (Moon/Sun) in top nav — Jira has no top-level theme toggle (Theme lives under Profile). | 🟢 Minor | Move theme toggle into the Profile dropdown (`Theme ›` submenu) to match Jira. Keep ⌘+shift+L or similar keyboard shortcut. |
| Cmd+K shortcut binding isn't explicit — global search uses a CustomEvent but the keydown handler wasn't found in preflight. | 🟡 Moderate | Add a `useHotkeys('mod+k')` binding at the app shell root that dispatches `open-global-search`. |

---

## 3. Visual Hierarchy — what Jira does, what Catalyst should match

Jira's top nav (reference image 1) follows a **three-group horizontal composition**:

**Left group** (nav controls + product identity): sidebar toggle → app switcher (8×8 dots) → product logo+wordmark.
**Center group** (actions): `+ Create` button (primary blue) → global search field (flex-1, fills space).
**Right group** (utility + user): `Ask Rovo` pill → notifications bell (with badge) → help → settings → avatar.

**Token spec (from atlassian.design):**

| Property | Value | Atlaskit token |
|---|---|---|
| Top nav height | 56px | `space.700` × 1 (spacing token) |
| Horizontal padding | 12px left / 12px right | `space.150` |
| Gap between icon buttons | 4px | `space.050` |
| Gap between groups | auto (flex) | — |
| Icon button size | 32×32 px hit target, 20×20 glyph | `space.400` |
| Icon button hover bg | `color.background.neutral.subtle.hovered` | token |
| Top nav bg (light) | `#FFFFFF` | `elevation.surface` |
| Top nav bg (dark) | `#1D2125` | `elevation.surface` |
| Bottom border | 1px `color.border` | `color.border` |
| Search field bg | `color.background.input` | token |
| Search field height | 32px | `space.400` |
| Create button | `appearance="primary"` | `@atlaskit/button` |
| Notification badge | pink/red circle w/ `9+` text when ≥10 | `color.background.danger.bold` |
| Avatar size | 24px (XS in Atlaskit) | `@atlaskit/avatar size="small"` |

**Reading flow:** Left identity → center action (Create/Search as primary tasks) → right utility (passive icons). This matches human left-to-right scan patterns and keeps destructive/settings actions at the periphery.

---

## 4. Consistency

| Element | Current Catalyst issue | Recommendation |
|---|---|---|
| Icon library | Mix of Lucide + Atlaskit icons | Standardize on `@atlaskit/icon` (or `@atlaskit/icon-lab` for newer icons) in the top nav. Retain Lucide elsewhere if cost of full migration is high; document the boundary. |
| Button components | Top nav uses Radix/custom; body uses Atlaskit | Top nav uses `@atlaskit/button` `IconButton` for all icon buttons; `Button` `appearance="primary"` for Create. |
| Dropdown pattern | CreateDropdown uses custom state; NotificationsPanel uses custom popover | All top-nav dropdowns use `@atlaskit/dropdown-menu` or `@atlaskit/popup` for consistency. |
| Spacing | Hardcoded px values | Use `@atlaskit/tokens` `token('space.*')` consistently. |
| Tooltip | Mixed Radix/native title | All top-nav icon buttons use `@atlaskit/tooltip` with `position="bottom"` — matches Jira. |
| Focus rings | Not consistent | Atlaskit primitives ship WCAG-compliant focus rings — just use the primitives. |

---

## 5. Per-Surface Atlaskit Implementation Spec

### 5.1 Top nav shell

**Atlaskit primitive:** `@atlaskit/atlassian-navigation` → `AtlassianNavigation` (canonical public top-nav shell).

**Structure:**
```tsx
<AtlassianNavigation
  label="Catalyst top navigation"
  primaryItems={[]}  // keep empty — Catalyst hub switching stays in its own row or moves to sidebar
  renderAppSwitcher={() => <AppSwitcher />}
  renderProductHome={() => <ProductHome icon={CatalystLogo} logo={CatalystWordmark} />}
  renderCreate={() => <CreateMenu />}
  renderSearch={() => <GlobalSearch />}
  renderHelp={() => <HelpMenu />}
  renderNotifications={() => <NotificationsMenu />}
  renderSettings={() => <SettingsMenu />}
  renderProfile={() => <ProfileMenu />}
  renderSignIn={undefined}
/>
```

**Atlaskit → Catalyst file migration:**
- `CatalystHeader.tsx` → becomes a thin wrapper around `AtlassianNavigation` + the existing hub-tab row below it.
- Move `CreateDropdown.tsx` under `renderCreate` — keep existing work-item types; wrap in Atlaskit `Popup` + `MenuGroup`.
- Move `NotificationsPanel.tsx` under `renderNotifications` — rebuild contents per §5.7.
- New: `AppSwitcher.tsx`, `HelpMenu.tsx`, `SettingsMenu.tsx`, `ProfileMenu.tsx`, `AskCatalystPill.tsx`.

### 5.2 Sidebar toggle (image 3)

**Atlaskit primitive:** Built into `@atlaskit/page-layout` — `LeftSidebar` exposes `onExpand`, `onCollapse`, `isFixed` props.

**Behavior per user requirement:**
> "when side panel expand and collapse is pressed, current side panel options must be visible"

**Implementation:**
- `LeftSidebar` default width: `240px` (Catalyst current) → `64px` when collapsed (icon-only).
- Toggle button: `@atlaskit/icon` chevron icon (`ChevronLeftIcon` / `ChevronRightIcon`) inside `IconButton`, positioned at the sidebar's top-right corner.
- On collapse: all current hub-specific sidebar items (from `SidebarBase.tsx`, `EnterpriseSidebar`, `ProductRoomSidebar`, etc.) render in **icon-only mode** with their Lucide/Atlaskit icons preserved — no items disappear. Use `@atlaskit/side-navigation` `ButtonItem` with `iconBefore` only (label hidden when collapsed).
- On expand: full list with labels + badges + Star favorites visible, exactly as today.
- Animation: 250ms ease-out (Atlaskit default).
- Persist state to `localStorage('cp.sidebar.expanded')` so the choice survives reloads.

### 5.3 App Switcher — **sole hub-navigation surface** (replaces hub-tab row)

**Decision (locked by user):** The 9 Catalyst hubs currently in the top-nav hub-tab row are **MOVED INSIDE the App Switcher dropdown**. The hub-tab row is **DELETED** from the top nav. The App Switcher becomes the single place a user switches hubs — matches Jira's pattern exactly.

**Reference:** Jira's App Switcher dropdown (the "MIM JIRA Instance" screenshot) — instance header, 36×36 colored tile icons, sectioned list, footer actions.

**Atlaskit primitives:** `@atlaskit/atlassian-navigation` `AppSwitcher` trigger + `@atlaskit/popup` + `@atlaskit/menu` + `@atlaskit/avatar` (for instance header) + custom colored tile components.

**Dropdown structure — top to bottom (width 360px):**

1. **Instance header** (padding `space.200`)
   - Left: 36×36 square tile with instance initials ("MI" on green background in Jira; for Catalyst use first 2 letters of tenant name on `color.background.accent.green.subtler`)
   - Middle: tenant name — `@atlaskit/heading` size `small`, weight 600 (e.g. "MIM Catalyst Instance")
   - Right: chevron-down `IconButton` → opens instance switcher (out of scope for this phase; render chevron as visual only, disabled click)
   - Thin divider below — `1px color.border`

2. **"Your hubs" section** — 9 Catalyst hubs as `LinkItem` rows. Each row:
   - 36×36 rounded 6px colored tile (icon background) + 18px white glyph inside
   - Hub name — text size 14px, weight 500, `color.text`
   - Hover: row background `color.background.neutral.subtle.hovered`
   - Active route: row background `color.background.selected`, left rail 3px `color.border.selected`
   - Clicking navigates via `useNavigate()` to the hub's landing route

3. **Divider** — `1px color.border`

4. **"Recommended for you" section** (optional — render only if we have integrations)
   - Heading: `text size small, weight 600, color.text.subtlest, uppercase-tracking 0.08em`
   - Rows: "More Catalyst apps" with 2×2 grid icon → routes to `/admin/marketplace` (or hide if no marketplace)

5. **Footer** (padding `space.150`)
   - `@atlaskit/button` `appearance="subtle"` — "Manage hubs" → routes to hub config (admin only)

**9 Catalyst hub tile designs (Jira-aesthetic — colored tile + white glyph):**

| # | Hub | Tile background token | Glyph | Route |
|---|---|---|---|---|
| 1 | Enterprise Hub | `color.background.accent.purple.bold` (#6554C0) | Building / skyscraper icon | `/enterprise` |
| 2 | Product Room | `color.background.accent.blue.bold` (#0C66E4) | Diamond / kite shield (Jira-diamond inspired) | `/product` |
| 3 | Project | `color.background.accent.teal.bold` (#227D9B) | Folder with checkmark | `/project` |
| 4 | Release | `color.background.accent.orange.bold` (#E56910) | Rocket | `/release` |
| 5 | Test | `color.background.accent.green.bold` (#1F845A) | Checklist / clipboard-with-ticks | `/test` |
| 6 | Incident | `color.background.accent.red.bold` (#C9372C) | Alert triangle / siren | `/incident` |
| 7 | Task | `color.background.accent.yellow.bold` (#946F00) | Check-in-circle | `/task` |
| 8 | Plan | `color.background.accent.magenta.bold` (#AE4787) | Calendar with grid | `/plan` |
| 9 | Wiki | `color.background.accent.lime.bold` (#5B7F24) | Open book / document | `/wiki` |

**Icon sourcing:** Pull from `@atlaskit/icon` where available (e.g. `BuildingIcon`, `RocketIcon`, `CalendarIcon`, `BookIcon`, `ChecklistIcon`); use `@atlaskit/icon-lab` for any missing shapes; fall back to inline SVG with 24×24 viewBox if Atlaskit doesn't ship a match. All glyphs render at 18×18 centered inside the 36×36 tile, color `color.icon.inverse` (white).

**Instance header tile:** Square tile (not rounded) with 2-letter initials, `@atlaskit/heading` size `xsmall` weight 700, centered. Background tint derived from tenant color (default `color.background.accent.green.subtler`).

**Keyboard:**
- Down / Up arrows navigate hub rows (native `@atlaskit/menu` behavior)
- Enter activates
- Escape closes the popup and returns focus to the 8×8 trigger

**Trigger icon (the 8×8 / 2×2 grid glyph itself):**
- Use `@atlaskit/icon-lab` `AppSwitcherIcon` if available
- Otherwise render inline SVG: 16×16 viewBox with **2×2 grid of rounded squares** (each square 6×6 with 2px gap, 1px corners) — matches Jira's current switcher glyph (the screenshots show a 2×2 "apps" icon, not 8×8)
- Wrap in `@atlaskit/button` `IconButton` size `medium`
- Tooltip (via `@atlaskit/tooltip`): "Switch hubs"
- On focus: Atlaskit default focus ring — do NOT override

**Removed code:**
- The 9-hub tab row in `CatalystHeader.tsx` (currently renders 9 `HubTab` components with active underline) — DELETE entirely
- Any `primaryItems` passed to `AtlassianNavigation` — leave empty `[]`

**Active-hub indication in the top nav (post-removal):**
- Since the hub row is gone, the ProductHome block now reads **"Catalyst › {Current Hub Name}"** — product wordmark stays on the left, and the active hub is shown as a breadcrumb-style label next to it (Jira uses the same pattern for the instance label)
- Current hub is read from the route via `useLocation()` and mapped to the display name

### 5.4 Product home (logo + wordmark)

**Atlaskit primitive:** `@atlaskit/atlassian-navigation` → `ProductHome`.

```tsx
<ProductHome
  href="/"
  icon={() => <img src="/catalyst-mark.svg" width={24} height={24} alt="" />}
  logo={() => <img src="/catalyst-wordmark.svg" height={20} alt="Catalyst" />}
  siteTitle="Catalyst"
/>
```

Wordmark weight: 600; tracking matches Jira's (–0.01em).

### 5.5 `+ Create` button

**Atlaskit primitive:** `@atlaskit/button` `Button` + `@atlaskit/popup` (or re-use existing CreateDropdown content inside).

```tsx
<Popup
  trigger={(props) => (
    <Button {...props} appearance="primary" iconBefore={<AddIcon label="" />}>
      Create
    </Button>
  )}
  content={() => <CreateMenuContent />}
/>
```

`CreateMenuContent` = existing `CreateDropdown.tsx` content refactored into a `MenuGroup` with:
- **Work Items** section: Business Request, Features, Stories, Defects, Tasks (with Atlaskit work-type icons)
- **Other Items** section: Objectives, Dependencies, Risks, Releases, Incidents, etc.

Keep the current 20+ types — just rewrap the chrome.

### 5.6 Global search (image 4 — scope limited)

**Atlaskit primitive:** `@atlaskit/textfield` + `@atlaskit/popup` + `@atlaskit/menu`.

**Scope per user (locked):**
- ✅ Filter chips: **Projects** + **Assignee** only (drop `App`)
- ✅ Recent searches (clock icon row)
- ✅ Recent items (`RECENT` section with work-item cards)
- ❌ Quick-nav chips (Boards/Spaces/Filters/Plans/Teams)
- ✅ `Search Catalyst for work items` row (enter key hint)
- ✅ `Search all apps` row (⌘+enter hint)

**Structure:**

```tsx
<Popup
  isOpen={isOpen}
  placement="bottom"
  trigger={(props) => (
    <Textfield
      {...props}
      elemBeforeInput={<SearchIcon />}
      placeholder="Search"
      onFocus={open}
      onKeyDown={handleCmdK}
    />
  )}
  content={() => (
    <Box>
      {/* Filter row — Projects + Assignee chips */}
      <Inline space="space.100">
        <ProjectsFilterChip value={projectFilter} onChange={setProjectFilter} />
        <AssigneeFilterChip value={assigneeFilter} onChange={setAssigneeFilter} />
      </Inline>

      {/* Recent query row */}
      <RecentQueryRow query={lastQuery} />

      {/* RECENT section */}
      <MenuGroup>
        <Heading size="xsmall">RECENT</Heading>
        {recentItems.map(item => (
          <LinkItem
            iconBefore={<WorkTypeIcon type={item.type} />}
            description={`${item.projectName} • ${item.workType}`}
            elemAfter={<Text size="small">You viewed {item.viewedAgo}</Text>}
          >
            {item.key}: {item.summary}
          </LinkItem>
        ))}
      </MenuGroup>

      {/* Footer rows */}
      <MenuGroup>
        <ButtonItem iconBefore={<SearchIcon />} elemAfter={<EnterKeyHint />}>
          Search Catalyst for work items
        </ButtonItem>
        <ButtonItem iconBefore={<SearchIcon />} elemAfter={<><AppIconStrip /><CmdEnterKeyHint /></>}>
          Search all apps
        </ButtonItem>
      </MenuGroup>

      <Box paddingBlock="space.100">
        <Text size="small" color="color.text.subtlest">
          Help us improve search · <a href="/feedback">Give feedback</a>
        </Text>
      </Box>
    </Box>
  )}
/>
```

**Existing `GlobalSearch.tsx` refactor:**
- Keep Zustand store (`globalSearchStore.ts`) and the work-item type icons
- Replace Radix `Dialog` → `@atlaskit/popup`
- Anchor popup to the textfield, not the window
- Remove the overlay/backdrop (popup closes on outside click naturally)

**Keyboard:**
- `⌘K` / `Ctrl+K` → focus textfield + open popup
- `↑` / `↓` → navigate rows
- `Enter` → execute "Search Catalyst for work items" with current query
- `⌘+Enter` → "Search all apps"
- `Esc` → close popup

### 5.7 Notifications (image 5 — full scope)

**Atlaskit primitives:** `@atlaskit/popup` + `@atlaskit/tabs` + `@atlaskit/toggle` + `@atlaskit/menu`.

**Anchor:** Bell `IconButton` with `Badge` overlay (`@atlaskit/badge` or custom) showing `9+` when count ≥10.

**Structure:**

```tsx
<Popup
  placement="bottom-end"
  trigger={(props) => (
    <Box position="relative">
      <IconButton {...props} icon={NotificationIcon} label="Notifications" />
      {unreadCount > 0 && (
        <Badge appearance="important">{unreadCount > 9 ? '9+' : unreadCount}</Badge>
      )}
    </Box>
  )}
  content={() => (
    <Box width="400px" maxHeight="640px" overflowY="auto">
      {/* Header */}
      <Flex padding="space.200" justify="space-between" align="center">
        <Heading size="medium">Notifications</Heading>
        <Flex gap="space.100">
          <Text size="small">Only show unread</Text>
          <Toggle isChecked={onlyUnread} onChange={setOnlyUnread} />
          <IconButton icon={ShortcutIcon} label="Open in full view" />
          <IconButton icon={MoreIcon} label="More options" />
        </Flex>
      </Flex>

      {/* Tabs */}
      <Tabs selected={tab} onChange={setTab}>
        <TabList>
          <Tab>Direct</Tab>
          <Tab>Watching</Tab>
        </TabList>
        <TabPanel>
          <NotificationList items={directNotifications} />
        </TabPanel>
        <TabPanel>
          <NotificationList items={watchingNotifications} />
        </TabPanel>
      </Tabs>
    </Box>
  )}
/>
```

**NotificationList item anatomy (`NotificationItem.tsx`):**
- 32px avatar (left)
- Title line: `**{actor}** {action}` + timestamp (e.g. "2 hours ago")
- Work-item ref line: `{icon} {summary}` (bug/story/task/epic icon)
- Status line: `{BAU-KEY} · {status}` (e.g. "BAU-5563 · In Development")
- Unread dot: blue 6px circle, right side
- **If rollup** (`+N updates`): avatar + "+N updates from {actor}" link in blue
- **If comment mention** (reactions scope):
  - Quote block showing comment text
  - Reaction bar: 👍 👏 🔥 ❤️ + "add reaction" button (`@atlaskit/emoji` or custom)
  - `Reply` button (secondary) + `View thread` link (primary link color)

**Group header:** `Today`, `Yesterday`, `Earlier` — `@atlaskit/heading` size "xsmall", `color.text.subtlest`.

**Data model:**
```ts
type Notification = {
  id: string;
  tab: 'direct' | 'watching';
  actor: { id: string; name: string; avatarUrl: string };
  action: string;  // "updated a story", "mentioned you in a comment", etc.
  timestamp: string;  // ISO
  workItem: { key: string; type: WorkType; summary: string; status: string };
  unread: boolean;
  rollup?: { count: number; actor: { id: string; name: string; avatarUrl: string } };
  comment?: { text: string; link: string; reactions: Reaction[] };
};
```

Stub the data source for now; wire to a real backend later (out of scope for this phase).

### 5.8 Settings (image 6 — limited scope)

**Atlaskit primitive:** `@atlaskit/popup` + `@atlaskit/textfield` (for ⌘K) + `@atlaskit/menu`.

**Locked scope sections only:**

```tsx
<Popup
  content={() => (
    <Box width="400px">
      {/* ⌘K search bar */}
      <Box padding="space.200" borderBlockEnd="1px solid color.border">
        <Textfield
          placeholder="Search (⌘ + K)"
          elemBeforeInput={<SearchIcon />}
          isCompact
        />
      </Box>

      {/* Personal settings */}
      <MenuGroup>
        <Heading size="xsmall">Personal Catalyst settings</Heading>
        <LinkItem iconBefore={<PersonIcon />} description="Manage language, time zone, and other personal preferences" href="/settings/general">
          General settings
        </LinkItem>
        <LinkItem iconBefore={<NotificationIcon />} description="Manage email and in-app notifications from Catalyst" href="/settings/notifications">
          Notification settings
        </LinkItem>
      </MenuGroup>

      {/* Product admin — Work items only */}
      <MenuGroup>
        <Heading size="xsmall">Catalyst admin settings</Heading>
        <LinkItem iconBefore={<WorkItemIcon />} description="Configure work types, workflows, screens, fields, and more" href="/admin/work-items">
          Work items
        </LinkItem>
      </MenuGroup>
    </Box>
  )}
  trigger={(props) => (
    <IconButton {...props} icon={SettingsIcon} label="Settings" />
  )}
/>
```

**Admin gating:** The `Catalyst admin settings` section only renders if `user.hasRole('admin')` — matches Jira behavior.

**⌘K search** filters the visible rows by label substring (simple client-side filter, no backend call).

### 5.9 Profile menu (image 7 — full)

**Atlaskit primitive:** `@atlaskit/popup` + `@atlaskit/menu`.

```tsx
<Popup
  placement="bottom-end"
  trigger={(props) => (
    <IconButton {...props} icon={() => <Avatar src={user.avatarUrl} size="small" />} label="Account" />
  )}
  content={() => (
    <Box width="320px">
      {/* User card header */}
      <Box padding="space.200" backgroundColor="color.background.neutral.subtle">
        <Flex gap="space.150" align="center">
          <Avatar src={user.avatarUrl} size="large" />
          <Stack>
            <Heading size="small">{user.name}</Heading>
            <Text size="small" color="color.text.subtlest">{user.email}</Text>
          </Stack>
        </Flex>
      </Box>

      <MenuGroup>
        <LinkItem iconBefore={<PersonIcon />} href="/profile">Profile</LinkItem>
        <LinkItem iconBefore={<SettingsIcon />} href="/settings">Account settings</LinkItem>
        <NestingItem iconBefore={<ThemeIcon />} title="Theme">
          <ButtonItem onClick={() => setTheme('light')}>Light</ButtonItem>
          <ButtonItem onClick={() => setTheme('dark')}>Dark</ButtonItem>
          <ButtonItem onClick={() => setTheme('system')}>Match system</ButtonItem>
        </NestingItem>
        <LinkItem iconBefore={<OpenIcon />} href="/quickstart">Open Quickstart</LinkItem>
      </MenuGroup>

      {/* Upgrade */}
      <MenuGroup>
        <Heading size="xsmall">Upgrade</Heading>
        <LinkItem elemAfter={<Lozenge appearance="new">FREE 30-DAY TRIAL</Lozenge>}>
          Try the Premium plan
        </LinkItem>
      </MenuGroup>

      {/* Integrations */}
      <MenuGroup>
        <LinkItem iconBefore={<SlackIcon />} href="/integrations/slack">Slack</LinkItem>
      </MenuGroup>

      {/* Account actions */}
      <MenuGroup>
        <ButtonItem iconBefore={<SwitchIcon />} onClick={switchAccount}>Switch account</ButtonItem>
        <ButtonItem iconBefore={<LogoutIcon />} onClick={logout}>Log out</ButtonItem>
      </MenuGroup>
    </Box>
  )}
/>
```

**Theme submenu** replaces the current top-nav sun/moon toggle. Keep keyboard shortcut.

### 5.10 Ask Catalyst pill (rebranded Rovo)

**Atlaskit primitive:** `@atlaskit/button` with custom `appearance` via `css` prop OR use `@atlaskit/primitives` `Box` + `Pressable`.

```tsx
<Pressable onClick={openAsk}>
  <Flex align="center" gap="space.100" padding="space.100" borderRadius="6px" borderColor="color.border" backgroundColor="color.background.input">
    <img src="/catalyst-ai-icon.svg" width={16} height={16} alt="" />
    <Text>Ask Catalyst</Text>
  </Flex>
</Pressable>
```

**Behavior:** Stub — opens a modal that says "Ask Catalyst AI — coming soon" for now. Placeholder for real integration. Same visual weight as Jira's Rovo pill.

### 5.11 Help menu (minimum viable — not in user's locked scope)

**Ask the user:** Help icon is in Jira's top nav (`?` icon between notifications and settings). We either skip it (visual gap) or implement a minimal dropdown: Documentation, Keyboard shortcuts, Report a bug, What's new. **Recommendation:** minimal stub for visual parity, 4 `LinkItem`s. Flag for confirmation below.

---

## 6. Accessibility (WCAG 2.1 AA)

| Check | Status in Atlaskit | Catalyst action |
|---|---|---|
| Color contrast — text on surface | ✅ (Atlaskit tokens meet 4.5:1) | Use tokens; don't override colors |
| Touch target size | ✅ 32×32 IconButton hit target meets 24px minimum | — |
| Keyboard navigation — tab order | ✅ Atlaskit primitives have correct tabindex | Verify left-to-right top-nav tab order |
| Keyboard navigation — dropdowns | ✅ `@atlaskit/menu` supports arrow-key nav, Home/End, Escape | — |
| Screen reader labels | ✅ `IconButton` requires `label` prop | Audit all IconButtons have descriptive labels |
| Focus rings | ✅ Atlaskit ships WCAG-compliant focus indicators | Don't override `outline: none` |
| Unread badge accessible name | ⚠️ Custom | Add `aria-label="9 unread notifications"` |
| Search popup — focus trap | ✅ `@atlaskit/popup` handles | — |
| Reduced motion | ✅ Atlaskit respects `prefers-reduced-motion` | — |

---

## 7. What Works Well (Catalyst today)

- **Atlaskit infrastructure is already in place** — `AdsThemeProvider` + `@atlaskit/tokens` means dark/light theming will work for free.
- **Create dropdown is rich** — 20+ work-item types with icons and sensible grouping. Just needs Atlaskit chrome around it.
- **Sidebar is modular** — 8 hub-specific sidebars via `SidebarBase.tsx` is a clean pattern; Atlaskit `LeftSidebar` wraps cleanly around it.
- **Global search store (Zustand)** — clean state management; needs UI swap, not logic rewrite.
- **UserAvatar** — already uses `@atlaskit/avatar`; no rebuild needed.

---

## 8. Priority Recommendations

1. **Ship Settings + Profile dropdowns first** — they're currently 🔴 Critical usability gaps (no sign-out, no settings path). Fastest pixel-parity win: both are pure `@atlaskit/dropdown-menu` + `@atlaskit/menu` compositions.
2. **Swap Global Search modal → popup** — biggest UX delta vs. Jira; keeps users in flow.
3. **Rebuild Notifications panel** — currently mock; user wants full scope (tabs, reactions, rollups).
4. **Add App Switcher + Ask Catalyst pill + Help menu** — completes the right-side utility cluster for visual parity.
5. **Migrate top-nav shell to `@atlaskit/atlassian-navigation`** last — biggest structural refactor; do after individual dropdowns are in place so each can be swapped atomically.

---

## 9. Resolved Decisions (locked)

1. **Help menu** → **SKIPPED.** Do not render a Help icon in the top nav. Visual gap vs. Jira is accepted.
2. **Catalyst hub-tab row** → **REMOVED from top nav.** User sent the App Switcher reference screenshot confirming the treatment. All 9 Catalyst hubs are moved inside the App Switcher (8×8 grid) dropdown per §5.3. The active hub name appears next to the Catalyst wordmark as a breadcrumb-style label (matching Jira's instance label pattern).
3. **Ask Catalyst pill** → **VISUAL-ONLY, NO HANDLER.** Render the pill with disabled styling (reduced opacity, `cursor: not-allowed`, `aria-disabled="true"`). No modal, no click handler. Pill is purely for visual parity with Jira's Rovo.
4. **Notifications data source** → **WIRE TO ATLASSIAN (JIRA) WEBHOOK / MCP.** Use the connected Atlassian MCP (`mcp__cedf80a0-*`) to pull real issue updates, comments, mentions, and assignments for the logged-in user. Map each Jira event to the NotificationItem anatomy from §5.7. Mock fixtures are NOT acceptable — real data only.

### Notifications — Atlassian-MCP mapping

| NotificationItem field | Atlassian source |
|---|---|
| `actor.name` / `actor.avatarUrl` | `changelog.author` or `comment.author` from Jira issue payload |
| `action` | Derived from change type: "updated a story" (for `issuetype` story updates), "assigned a work item to you" (for `assignee` change → current user), "mentioned you in a comment" (comment body contains user's mention), etc. |
| `timestamp` | `changelog.created` or `comment.created` |
| `workItem.key` | `issue.key` (e.g. BAU-5563) |
| `workItem.type` | `issue.fields.issuetype.name` (Bug, Story, Task, Epic, Subtask, Incident) |
| `workItem.summary` | `issue.fields.summary` |
| `workItem.status` | `issue.fields.status.name` (ToDo, In Development, In Review, Done) |
| `unread` | `true` if `changelog.created > user.lastSeenNotificationsAt`; persist `lastSeenNotificationsAt` client-side to Supabase user prefs |
| `rollup.count` | Count of events from same `actor` on same `issue` in last 24h when > 1 |
| `comment.text` | `comment.body` (plain text, ADF stripped) |
| `comment.link` | `https://digital-transformation.atlassian.net/browse/{issue.key}?focusedCommentId={comment.id}` |
| `comment.reactions` | `comment.reactions` from Jira comment payload (if exposed by MCP) — else hide reaction bar |

**Tab filter:**
- `Direct` = events where current user is assignee OR mentioned in the comment
- `Watching` = events on issues in the current user's watch list (`issue.fields.watches.isWatching === true`)

**Data layer location:** `src/hooks/useNotifications.ts` — a React Query hook that calls a thin wrapper around the Atlassian MCP. Polling interval 60s, or real-time via Supabase edge function subscribed to Jira webhooks (preferred, larger scope — flag as follow-up if infra isn't ready).

---

## 10. Jira → Atlaskit → Catalyst File Mapping (quick reference)

| Jira surface | Atlaskit primitive | Catalyst file (new or modify) |
|---|---|---|
| Top nav shell | `@atlaskit/atlassian-navigation` `AtlassianNavigation` | `src/components/ja/CatalystHeader.tsx` (rewrite) |
| Sidebar toggle | `@atlaskit/page-layout` `LeftSidebar` (built-in) | `src/components/layout/CatalystShell.tsx` (wrap) |
| App switcher | `@atlaskit/atlassian-navigation` `AppSwitcher` + `@atlaskit/menu` | `src/components/layout/AppSwitcher.tsx` (new) |
| Product home | `ProductHome` | inline in `CatalystHeader.tsx` |
| Create | `@atlaskit/button` + `@atlaskit/popup` + `@atlaskit/menu` | `src/components/layout/dropdowns/CreateDropdown.tsx` (wrap) |
| Global search | `@atlaskit/textfield` + `@atlaskit/popup` + `@atlaskit/menu` | `src/components/global-search/GlobalSearch.tsx` (rewrite body; keep Zustand store) |
| Ask Catalyst | `@atlaskit/primitives` `Pressable` + `Flex` | `src/components/layout/AskCatalystPill.tsx` (new) |
| Notifications | `@atlaskit/popup` + `@atlaskit/tabs` + `@atlaskit/menu` + `@atlaskit/toggle` | `src/components/layout/dropdowns/NotificationsPanel.tsx` (rewrite) |
| Help | `@atlaskit/popup` + `@atlaskit/menu` | `src/components/layout/HelpMenu.tsx` (new) |
| Settings | `@atlaskit/popup` + `@atlaskit/textfield` + `@atlaskit/menu` | `src/components/layout/SettingsMenu.tsx` (new) |
| Profile | `@atlaskit/popup` + `@atlaskit/menu` + `@atlaskit/avatar` | `src/components/layout/ProfileMenu.tsx` (new) |
| Left sidebar items | `@atlaskit/side-navigation` | `src/components/layout/SidebarBase.tsx` (refactor) |
