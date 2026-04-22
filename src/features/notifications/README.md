# Notifications Feature — Direct Tab

Jira-parity Atlaskit implementation of the Notifications panel Direct tab.  
Reference: `https://digital-transformation.atlassian.net/jira/software/c/projects/ONE/boards/364`

---

## UI Anatomy

```
┌─────────────────────────────────────────────────────┐  ← 540px panel
│  Notifications          Only show unread [⊙] [↗] [⋮]│  ← header 24px top pad
├──────────────────────────────────────────────────────┤  ← 1px border
│  Direct  Watching                                    │  ← tabs 0 24px h-pad
├──────────────────────────────────────────────────────┤  ← 1px border
│  Today                                               │  ← 12px/600 mixed-case
│  ┌─────────────────────────────────────────────────┐ │
│  │ [YD]  Actor assigned a work item to you  4h ago●│ │  ← row
│  │       🔴 Item title that can wrap to 2 lines... │ │
│  │       ITEM-5618 • To Do                         │ │
│  │       [yd] +1 update from Actor                 │ │  ← aggregation row
│  └─────────────────────────────────────────────────┘ │
│  Yesterday                                           │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```

---

## Pixel Parity — Measured Dimensions (source: Jira DOM inspection)

> Values measured via `window.getComputedStyle()` on live Jira panel.

### Panel Shell
| Element | Measured (px) | Token | Notes |
|---------|:---:|---|---|
| Panel width | 540 | — | matches `PANEL_WIDTH` constant |
| Background | #FFFFFF | `color.background.default` | |
| Border radius | 4 | `border.radius` | |
| Shadow | `rgba(30,31,33,.15) 0 8px 12px, rgba(30,31,33,.31) 0 0 1px` | `elevation.shadow.overlay` | |

### Header
| Element | Measured (px) | Token | Notes |
|---------|:---:|---|---|
| Top padding | 16 | `space.200` | visual gap above title |
| Left/right padding | 24 | `space.300` | |
| Header row height | 32 | — | flex row auto-height |
| Controls gap | 8 | `space.100` | gap between items |
| Title font size | 24 | `font.size.400` | |
| Title font weight | 653 | 700 in code | no token for 653, use 700 |
| Title color | rgb(41,42,46) = #292A2E | `color.text` | |
| Toggle label font | 14px / weight 400 | `font.size.200` | |
| Icon button size | 24×24 | — | standard icon hit area |

### Tabs
| Element | Measured (px) | Token | Notes |
|---------|:---:|---|---|
| Tab list padding | 0 24px | `space.0` `space.300` | |
| Tab row height | 32 | — | |
| Tab font size | 14 | `font.size.200` | |
| Tab font weight | 500 | `font.weight.medium` | |
| Active tab color | rgb(24,104,219) = #1868DB | `color.link` | |
| Inactive tab color | rgb(80,82,88) = #505258 | `color.text.subtle` | |
| Active indicator | 2px solid #1868DB bottom border | — | flush with row bottom |
| Tab bottom divider | 1px solid #EBECF0 | `color.border` | |

### Date Group Header
| Element | Measured (px) | Token | Notes |
|---------|:---:|---|---|
| Font size | 12 | `font.size.075` | |
| Font weight | 600 | `font.weight.semibold` | |
| Color | rgb(107,110,118) = #6B6E76 | `color.text.subtlest` | |
| text-transform | **none** | — | mixed-case "Today" (NOT "TODAY") |
| Padding | 12px 24px 6px | `space.150` `space.300` | |

### Notification Row
| Element | Measured (px) | Token | Notes |
|---------|:---:|---|---|
| Row padding | 12px 16px 12px 24px | `space.150` `space.200` `space.300` | |
| Row height (base) | ~80 | — | auto-height |
| Row height (+ aggregation) | ~144 | — | auto-height |
| Hover background | #F7F8F9 | `color.background.neutral.subtle.hovered` | |
| Active/pressed | #EBECF0 | `color.background.neutral.subtle.pressed` | |
| Row bottom border | 1px solid #EBECF0 | `color.border` | |

### Avatar & Unread Dot
| Element | Measured (px) | Token | Notes |
|---------|:---:|---|---|
| Main avatar size | 40 (`medium`) | `@atlaskit/avatar` size | |
| Mini avatar (aggregation) | 24 (`xsmall`) | `@atlaskit/avatar` size | |
| Avatar → content gap | 12 | `space.150` | |
| Unread dot diameter | 8 | — | no token, px override |
| Unread dot color | #1868DB | `color.background.information.bold` | |

### Typography
| Text role | Size | Weight | Color | Notes |
|-----------|:---:|:---:|---|---|
| Action line (verb) | 14px | 400 (600 if unread) | #292A2E | |
| Relative time | 12px | 400 | #6B6E76 | |
| Item title | 14px | 400 | #292A2E | 2-line clamp |
| Meta line (key • status) | 12px | 400 | #505258 | plain text, **no Lozenge** |
| Aggregation text | 14px | 400 | #1868DB | blue link style |

### Non-token px log
| Property | Value | Where | Why |
|----------|:---:|---|---|
| unread dot w/h | 8px | `NotificationRow` | no ADS token for 8px circle |
| mark-read button w/h | 22px | `NotificationRow` | hit target between icon sizes |
| aggregation paddingLeft | 52px | `NotificationRow` | avatar(40) + gap(12) — layout math |
| font-weight | 700 | header title | nearest to measured 653 |

---

## Data Flow

```
useNotificationsInfinite(tab, onlyUnread)
    ↓ useInfiniteQuery(['notif-feature', tab, onlyUnread])
    ↓ api/notificationsApi.ts → getNotifications() [mock, cursor-based]
    ↓ groupNotificationsByDay() → DateGroup[]
    ↓ NotificationGroup → NotificationRow × N

Mutations (optimistic):
  useMarkRead   → onMutate patches readAt in cache → onError rolls back
  useMarkAllRead → onMutate clears all readAt → onError rolls back
```

---

## Hooks & Cache Keys

| Hook | Query key | Invalidates on |
|------|---|---|
| `useNotificationsInfinite` | `['notif-feature', tab, onlyUnread]` | any mutation settle |
| `useMarkRead` | — mutation | settles on same key |
| `useMarkAllRead` | — mutation | settles on same key |

---

## Extensibility

**Add a new verb:** add a case to `getVerbLabel()` in `utils/date.ts`.  
**Add a new tab:** extend `NotificationTab` union in `types.ts`, add a button in the `DirectTab` tab list.  
**Plug in real backend:** replace `api/notificationsApi.ts` functions with `fetch()` calls; hook signatures are unchanged.

---

## ADS References
- Design system: https://atlassian.design/
- Tokens: https://atlassian.design/foundations/tokens/
- Spacing: https://atlassian.design/foundations/spacing/
- Typography: https://atlassian.design/foundations/typography/
- Tabs: https://atlassian.design/components/tabs/
- Toggle: https://atlassian.design/components/toggle/
- Avatar: https://atlassian.design/components/avatar/
- Dropdown menu: https://atlassian.design/components/dropdown-menu/
- Button: https://atlassian.design/components/button/
- Primitives: https://atlassian.design/components/primitives/

---

## Pixel Parity Checklist

- [ ] Panel width 540px matches Jira panel
- [ ] Title "Notifications" 24px/700, color #292A2E
- [ ] Atlaskit `Toggle` rendered for "Only show unread"
- [ ] Tabs: Direct (blue #1868DB, 2px underline) / Watching (grey)
- [ ] Date headers mixed-case "Today"/"Yesterday"/"Older" — 12px/600 — NOT uppercase
- [ ] Atlaskit `Avatar` (medium=40px, xsmall=24px)
- [ ] Meta line plain text "ITEM-XXXX • Status" — NO Lozenge
- [ ] Unread blue dot (8px, #1868DB) → ✓ mark-read button on hover
- [ ] Optimistic mark-read (dot vanishes immediately, rolls back on error)
- [ ] Row hover background #F7F8F9
- [ ] Loading skeleton matches row height
- [ ] Empty states for no-notifs and no-unread
- [ ] Error state with retry
- [ ] Keyboard: tab/enter/space on rows, focus ring visible
