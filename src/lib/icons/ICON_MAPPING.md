# Icon Mapping Reference — @atlaskit/icon → icon-registry

**Quick lookup table for migrating code from scattered @atlaskit/icon imports to the centralized registry.**

---

## Chat Toolbar Icons (MessageActionsToolbar)

| Old Import | Old Usage | New Import | New Usage | Notes |
|---|---|---|---|---|
| `import CopyIconCore from '@atlaskit/icon/core/copy'` | `<CopyIconCore size="small" />` | `import { CopyIcon }` | `<CopyIcon />` | Size baked-in (16px) |
| Custom SVG | `<svg>` bell | `import { BellIcon }` | `<BellIcon filled={isUnread} />` | Fill toggle added |
| Custom SVG | `<svg>` clock | `import { ClockIcon }` | `<ClockIcon />` | Size baked-in (16px) |
| Custom SVG | `<svg>` arrow-up | `import { ArrowUpIcon }` | `<ArrowUpIcon />` | Size baked-in (16px) |

---

## Navigation Icons (Dropdowns, Expand/Collapse)

| Old Import | Old Usage | New Import | New Usage | Notes |
|---|---|---|---|---|
| `import ChevronDownGlyph from '@atlaskit/icon/glyph/chevron-down'` | `<ChevronDownGlyph size="small" />` | `import { ChevronDown }` | `<ChevronDown />` or `<ChevronDown size="medium" />` | Size prop added (default small) |
| `import ChevronRightGlyph from '@atlaskit/icon/glyph/chevron-right'` | `<ChevronRightGlyph size="small" />` | `import { ChevronRight }` | `<ChevronRight />` | Size prop added |
| `import ChevronLeftGlyph from '@atlaskit/icon/glyph/chevron-left'` | `<ChevronLeftGlyph size="small" />` | `import { ChevronLeft }` | `<ChevronLeft />` | Size prop added |

---

## Action Icons (Buttons, Inline Actions)

| Old Import | Old Usage | New Import | New Usage | Size Prop | Notes |
|---|---|---|---|---|---|
| `import AddIconCore from '@atlaskit/icon/core/add'` | `<AddIconCore size="small" />` | `import { AddIcon }` | `<AddIcon />` or `<AddIcon size="medium" />` | Yes | Default small (16px) |
| `import DeleteIconCore from '@atlaskit/icon/core/delete'` | `<DeleteIconCore size="small" />` | `import { DeleteIcon }` | `<DeleteIcon />` or `<DeleteIcon size="medium" />` | Yes | Default small (16px) |
| `import SearchIconCore from '@atlaskit/icon/core/search'` | `<SearchIconCore size="small" />` | `import { SearchIcon }` | `<SearchIcon />` | No | Always 16px |
| `import EditIconCore from '@atlaskit/icon/core/edit'` | `<EditIconCore size="small" />` | `import { EditIcon }` | `<EditIcon />` | No | Always 16px |
| `import RefreshIconCore from '@atlaskit/icon/core/refresh'` | `<RefreshIconCore size="small" />` | `import { RefreshIcon }` | `<RefreshIcon />` | No | Always 16px |
| `import DownloadIconCore from '@atlaskit/icon/core/download'` | `<DownloadIconCore size="small" />` | `import { DownloadIcon }` | `<DownloadIcon />` | No | Always 16px |
| `import SettingsIconCore from '@atlaskit/icon/core/settings'` | `<SettingsIconCore size="small" />` | `import { SettingsIcon }` | `<SettingsIcon />` | No | Always 16px |
| `import PeopleGroupIconCore from '@atlaskit/icon/core/people-group'` | `<PeopleGroupIconCore size="small" />` | `import { PeopleGroupIcon }` | `<PeopleGroupIcon />` | No | Always 16px |
| `import ShieldIconCore from '@atlaskit/icon/core/shield'` | `<ShieldIconCore size="small" />` | `import { ShieldIcon }` | `<ShieldIcon />` | No | Always 16px |
| `import CheckMarkIconCore from '@atlaskit/icon/core/check-mark'` | `<CheckMarkIconCore size="small" />` | `import { CheckMarkIcon }` | `<CheckMarkIcon />` | No | Always 16px |
| `import WarningIconCore from '@atlaskit/icon/core/warning'` | `<WarningIconCore size="small" />` | `import { WarningIcon }` | `<WarningIcon />` | No | Always 16px |
| `import LinkIconCore from '@atlaskit/icon/core/link'` | `<LinkIconCore size="small" />` | `import { LinkIcon }` | `<LinkIcon />` | No | Always 16px |
| `import CloseIconCore from '@atlaskit/icon/core/close'` | `<CloseIconCore size="small" />` | `import { CloseIcon }` | `<CloseIcon />` or `<CloseIcon size="medium" />` | Yes | Default small (16px) |

---

## Status & Alert Icons

| Old Import | Old Usage | New Import | New Usage | Notes |
|---|---|---|---|---|
| `import CheckCircleIconCore from '@atlaskit/icon/core/check-circle'` | `<CheckCircleIconCore size="small" />` | `import { CheckCircle }` | `<CheckCircle />` | Always 16px (success state) |
| N/A | N/A | `import { WarningIcon }` | `<WarningIcon />` | Always 16px (error/alert state) |

---

## Legacy/Deprecated Icons (Not in Registry)

These icons are used in very few places or are deprecated. Use direct Atlaskit imports if needed.

| Icon | Atlaskit Path | Status | Recommendation |
|---|---|---|---|
| Drag Handler | `@atlaskit/icon/glyph/drag-handler` | Used in table/list reordering | In registry as `<DragHandle />` |
| Cross | `@atlaskit/icon/glyph/cross` | Close button variant | In registry as `<Cross />` |
| Trash | `@atlaskit/icon/glyph/trash` | Delete button variant | In registry as `<TrashIcon />` |
| Editor Add | `@atlaskit/icon/glyph/editor/add` | Rich editor toolbar | Keep as direct import if needed |
| Shortcut | `@atlaskit/icon/glyph/shortcut` | Keyboard shortcut indicator | Keep as direct import if needed |

---

## Emoji Reactions (NOT Icons)

| Context | Old | New | Notes |
|---|---|---|---|
| Quick reactions (6) | Various icon fonts | `['👍', '❤️', '😂', '😮', '😢', '🔥']` | Unicode emojis, no icon library |
| Emoji picker trigger | N/A | `<SmileIcon />` | Optional visual trigger for full emoji picker |
| Full emoji grid | N/A | `EMOJI_CATEGORIES` in ReactionPicker | Organized by category, search-enabled |

---

## Find & Replace Cheat Sheet

### For VS Code / Regex Find & Replace

**Find:** `import (\w+) from '@atlaskit/icon/core/(\w+[-\w]*)'`  
**Replace:** `import { $1Wrapper } from '@/lib/icons/icon-registry'`  
**Then:** Rename `$1Wrapper` to match the wrapped version (e.g., `CopyIconCoreWrapper` → `CopyIcon`)

---

## Migration Progress Template

Copy & paste to track migration across files:

```markdown
## Phase B Chat Icons

- [ ] MessageActionsToolbar.tsx — CopyIcon, BellIcon, ClockIcon, ArrowUpIcon
- [ ] ReactionPicker.tsx — SmileIcon (if adding), QUICK_REACTION_EMOJIS

## Phase 3 Global

### Admin Pages
- [ ] UserAccessPage.tsx — SearchIcon, AddIcon, DeleteIcon, ChevronDown
- [ ] ComponentsAdminPage.tsx — EditIcon, RefreshIcon, TrashIcon
- [ ] DesignSystemAdmin.tsx — WarningIcon, CloseIcon

### Project Hub
- [ ] AllProjectsTable.tsx — ChevronRight, ChevronDown, DeleteIcon, DragHandle
- [ ] BacklogPage.tsx — ChevronDown, AddIcon, TrashIcon
- [ ] KanbanBoardPage.tsx — ChevronRight, SearchIcon

### Product Hub
- [ ] ProductHubSidebar.tsx — ChevronDown, AddIcon
- [ ] ProductHubTable.tsx — ChevronRight, DeleteIcon

### Remaining
- [ ] DockDirectory.tsx — SearchIcon, AddIcon
- [ ] ChatDock.tsx — ChevronDown, CrossGlyph → Cross
```

---

## Batch Migration Command

**Find all remaining @atlaskit/icon imports:**

```bash
grep -r "@atlaskit/icon" ~/catalyst/src --include="*.tsx" --include="*.ts" | \
  grep -v "icon-registry.ts" | \
  grep import | \
  cut -d: -f1 | \
  sort | uniq -c | sort -rn
```

**Output example:**
```
  15 src/components/admin/AllProjectsTable.tsx
  12 src/components/admin/ComponentsAdminPage.tsx
   8 src/pages/productHub/ProductHubSidebar.tsx
   ...
```

---

## Conflict Resolution

**If you're unsure which icon to use:**

1. Check this table first
2. If not listed, check `icon-registry.ts` source code
3. If missing from registry, add it (one-time, benefits whole codebase)
4. If it's @atlaskit/icon but not in registry, create a wrapper using the template in ICON_MIGRATION_GUIDE.md

---

## Related Links

- [Icon Registry Source](./icon-registry.ts)
- [Icon Migration Guide](./ICON_MIGRATION_GUIDE.md)
- [Atlaskit Icon v35 Catalogue](https://atlassian.design/components/icon/)
- [Catalyst Design System (CLAUDE.md)](../../CLAUDE.md#🎨-catalyst-design-system)
