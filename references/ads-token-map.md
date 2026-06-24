# ADS Token Map — Catalyst Color Migration

> Fix pattern: wrap standalone hex/rgba with `var(--ds-TOKEN, #originalFallback)`
> Scanner skips hex inside `var(--ds-*, #hex)` fallbacks — the fallback IS the original value.

---

## TEXT COLORS

| Hex Value | ADS Token | Notes |
|-----------|-----------|-------|
| `#172B4D` | `var(--ds-text, #172B4D)` | Primary text — dark navy |
| `#44546F` / `#44546f` | `var(--ds-text-subtle, #44546F)` | Subtle text — medium slate |
| `#42526E` | `var(--ds-text-subtle, #42526E)` | Older subtle text variant |
| `#626F86` | `var(--ds-text-subtlest, #626F86)` | Subtlest text |
| `#6B778C` / `#6b778c` | `var(--ds-text-subtlest, #6B778C)` | Subtlest text v2 |
| `#6B6E76` | `var(--ds-text-subtlest, #6B6E76)` | Jira sidebar muted text |
| `#8590A2` | `var(--ds-text-disabled, #8590A2)` | Disabled text |
| `#8993A5` | `var(--ds-text-disabled, #8993A5)` | Disabled text v2 |
| `#B3BAC5` | `var(--ds-text-disabled, #B3BAC5)` | Disabled text light |
| `#AE2A19` | `var(--ds-text-danger, #AE2A19)` | Danger / error text |
| `#974F0C` | `var(--ds-text-warning, #974F0C)` | Warning text |
| `#216E4E` | `var(--ds-text-success, #216E4E)` | Success text |
| `#006644` | `var(--ds-text-success, #006644)` | Success text dark |
| `#0C66E4` | `var(--ds-link, #0C66E4)` | Link / brand blue |
| `#0052CC` | `var(--ds-link, #0052CC)` | Link dark |
| `#0747A6` | `var(--ds-link-pressed, #0747A6)` | Link pressed |
| `#253858` | `var(--ds-text, #253858)` | Dark text |

---

## SURFACE / BACKGROUND

| Hex Value | ADS Token | Notes |
|-----------|-----------|-------|
| `#FFFFFF` / `#ffffff` / `#fff` / `#FFF` | `var(--ds-surface, #FFFFFF)` | Page surface (bg context) |
| `#F7F8F9` / `#f7f8f9` | `var(--ds-surface-sunken, #F7F8F9)` | Sunken surface |
| `#F4F5F7` | `var(--ds-background-neutral-subtle, #F4F5F7)` | Neutral subtle |
| `#F1F2F4` | `var(--ds-background-neutral, #F1F2F4)` | Neutral fill |
| `#FAFAFA` / `#fafafa` | `var(--ds-surface-sunken, #FAFAFA)` | Near-white surface |
| `#F8F8F7` | `var(--ds-surface-sunken, #F8F8F7)` | Warm near-white |
| `#FCFCFC` | `var(--ds-surface, #FCFCFC)` | Near-white |
| `#F0F0F0` / `#f0f0f0` | `var(--ds-background-neutral, #F0F0F0)` | Light grey |
| `#EDEDED` | `var(--ds-background-neutral, #EDEDED)` | Light grey v2 |
| `#E8E8E8` / `#e8e8e8` | `var(--ds-border, #E8E8E8)` | Border/separator |

---

## STATUS BACKGROUNDS

| Hex Value | ADS Token | Notes |
|-----------|-----------|-------|
| `#E9F2FF` / `#E9F2FE` | `var(--ds-background-selected, #E9F2FF)` | Selected / info blue |
| `#DEEBFF` / `#dbeafe` / `#DBEAFE` | `var(--ds-background-information, #E9F2FF)` | Info blue light |
| `#EFF6FF` / `#eff6ff` | `var(--ds-background-information, #E9F2FF)` | Info blue lightest |
| `#E0F2FE` / `#e0f2fe` | `var(--ds-background-information, #E9F2FF)` | Info sky |
| `#BFDBFE` / `#bfdbfe` | `var(--ds-background-information, #E9F2FF)` | Info blue-200 |
| `#DFFCF0` / `#DCFFF1` / `#E3FCEF` | `var(--ds-background-success, #DFFCF0)` | Success green |
| `#D1FAE5` / `#d1fae5` | `var(--ds-background-success, #DFFCF0)` | Success emerald |
| `#CCFBF1` / `#ccfbf1` | `var(--ds-background-success, #DCFFF1)` | Success teal |
| `#BBF7D0` | `var(--ds-background-success, #DFFCF0)` | Success green-100 |
| `#F0FDFA` / `#f0fdfa` | `var(--ds-background-success, #DFFCF0)` | Success teal-50 |
| `#FFF7D6` / `#FFF7d6` | `var(--ds-background-warning, #FFF7D6)` | Warning yellow |
| `#FEF3C7` / `#fef3c7` | `var(--ds-background-warning, #FFF7D6)` | Warning amber-100 |
| `#FFFBEB` / `#fffbeb` | `var(--ds-background-warning, #FFF7D6)` | Warning amber-50 |
| `#FEF9C3` | `var(--ds-background-warning, #FFF7D6)` | Warning yellow-100 |
| `#FFECEB` / `#FEE2E2` / `#fee2e2` | `var(--ds-background-danger, #FFECEB)` | Danger red |
| `#FEF2F2` / `#fef2f2` | `var(--ds-background-danger, #FFECEB)` | Danger red-50 |
| `#FFF1F2` | `var(--ds-background-danger, #FFECEB)` | Danger rose-50 |
| `#F3F0FF` / `#EDE9FE` / `#ede9fe` | `var(--ds-background-discovery, #F3F0FF)` | Discovery purple |
| `#E0E7FF` / `#e0e7ff` | `var(--ds-background-discovery, #F3F0FF)` | Discovery indigo-100 |
| `#F5F3FF` | `var(--ds-background-discovery, #F3F0FF)` | Discovery violet-50 |

---

## BOLD / SOLID BACKGROUNDS

| Hex Value | ADS Token | Notes |
|-----------|-----------|-------|
| `#0C66E4` / `#0c66e4` | `var(--ds-background-information-bold, #0C66E4)` | Info blue bold |
| `#1F845A` | `var(--ds-background-success-bold, #1F845A)` | Success green bold |
| `#1B7F37` / `#16A34A` / `#16a34a` | `var(--ds-background-success-bold, #1F845A)` | Success green variants |
| `#C9372C` / `#CA3521` | `var(--ds-background-danger-bold, #C9372C)` | Danger red bold |
| `#E2B203` | `var(--ds-background-warning-bold, #E2B203)` | Warning yellow bold |
| `#F15B50` | `var(--ds-background-danger-bold, #C9372C)` | Danger red light bold |
| `#6E5DC6` / `#5E4DB2` | `var(--ds-background-discovery-bold, #6E5DC6)` | Discovery purple bold |

---

## BORDER

| Hex Value | ADS Token | Notes |
|-----------|-----------|-------|
| `#DFE1E6` / `#dfe1e6` | `var(--ds-border, #DFE1E6)` | Default border |
| `#E2E8F0` / `#e2e8f0` | `var(--ds-border, #DFE1E6)` | Border (Tailwind slate-200) |
| `#E5E5E5` / `#e5e5e5` | `var(--ds-border, #DFE1E6)` | Border grey |
| `#CBD5E1` / `#cbd5e1` | `var(--ds-border, #DFE1E6)` | Border slate-300 |
| `#D1D5DB` | `var(--ds-border, #DFE1E6)` | Border grey-300 |
| `#DCDFE4` | `var(--ds-border-disabled, #DCDFE4)` | Disabled border |
| `#8590A2` | `var(--ds-border-bold, #8590A2)` | Bold border |
| `#8696A7` | `var(--ds-border-bold, #8696A7)` | Bold border v2 |
| `#388BFF` | `var(--ds-border-focused, #388BFF)` | Focus ring |

---

## ICON

| Hex Value | ADS Token | Notes |
|-----------|-----------|-------|
| `#44546F` | `var(--ds-icon, #44546F)` | Default icon |
| `#626F86` | `var(--ds-icon-subtle, #626F86)` | Subtle icon |
| `#6B778C` / `#6b778c` | `var(--ds-icon-subtle, #6B778C)` | Subtle icon v2 |
| `#8590A2` | `var(--ds-icon-disabled, #8590A2)` | Disabled icon |
| `#0C66E4` | `var(--ds-icon-brand, #0C66E4)` | Brand icon |

---

## INTERACTION / HOVER

| Value | ADS Token | Notes |
|-------|-----------|-------|
| `rgba(9,30,66,0.06)` | `var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))` | Row hover |
| `rgba(9, 30, 66, 0.06)` | `var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))` | Row hover (spaced) |
| `rgba(9,30,66,0.14)` | `var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.14))` | Pressed |
| `rgba(9, 30, 66, 0.14)` | `var(--ds-background-neutral-subtle-pressed, rgba(9,30,66,0.14))` | Pressed (spaced) |
| `rgba(9,30,66,0.25)` | `var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.25))` | Shadow component |

---

## DARK MODE SURFACE VALUES

These values appear in `.dark {}` overrides — ADS resolves these automatically in dark mode. Wrap with the light-mode token and correct fallback.

| Dark Hex | ADS Token (light fallback) | Dark Mode Resolve |
|----------|---------------------------|-------------------|
| `#22272B` | `var(--ds-surface, #FFFFFF)` | Surface in dark |
| `#2C333A` | `var(--ds-background-neutral, #F1F2F4)` | Neutral in dark |
| `#1D2125` | `var(--ds-surface-sunken, #F7F8F9)` | Sunken in dark |
| `#282E33` | `var(--ds-surface-overlay, #FFFFFF)` | Overlay in dark |
| `#1E2328` | `var(--ds-background-neutral-subtle, #F7F8F9)` | Subtle in dark |
| `#30363D` | `var(--ds-background-neutral, #F1F2F4)` | Neutral-2 in dark |
| `#2E2E2E` | `var(--ds-background-neutral, #F1F2F4)` | Neutral grey dark |
| `#1F1F21` | `var(--ds-surface, #FFFFFF)` | Surface v2 dark |
| `#0A0A0A` / `#0a0a0a` | `var(--ds-text, #172B4D)` | Near-black text dark |
| `#171717` | `var(--ds-text, #172B4D)` | Text dark |
| `#0F172A` / `#0f172a` | `var(--ds-text, #172B4D)` | Slate-900 text |
| `#1E293B` / `#1e293b` | `var(--ds-text-subtle, #44546F)` | Slate-800 text |
| `#EDEDED` | `var(--ds-background-neutral, #F1F2F4)` | Light grey |
| `#878787` | `var(--ds-text-subtlest, #626F86)` | Grey text |
| `#A1A1A1` / `#a1a1a1` | `var(--ds-text-subtlest, #626F86)` | Grey text v2 |
| `#454545` | `var(--ds-text-subtle, #44546F)` | Medium grey text |

---

## CATALYST BRAND (No exact ADS match — use closest semantic)

| Hex Value | ADS Token (closest semantic) | Context |
|-----------|------------------------------|---------|
| `#0d9488` / `#0D9488` | `var(--ds-chart-teal-bold, #0d9488)` | Catalyst teal primary |
| `#0f766e` | `var(--ds-chart-teal-bolder, #0f766e)` | Teal hover/dark |
| `#14b8a6` | `var(--ds-background-accent-teal-bolder, #14b8a6)` | Teal light |
| `#2563eb` / `#2563EB` | `var(--ds-link, #2563eb)` | Catalyst blue primary |
| `#1d4ed8` / `#1D4ED8` | `var(--ds-link-pressed, #1d4ed8)` | Blue hover |
| `#3b82f6` / `#3B82F6` | `var(--ds-background-information-bold, #3b82f6)` | Blue-500 |
| `#1e40af` / `#1E40AF` | `var(--ds-link-pressed, #1e40af)` | Blue-800 dark |
| `#1e3a8a` | `var(--ds-text-inverse, #1e3a8a)` | Blue-900 |
| `#6366f1` / `#6366F1` | `var(--ds-background-discovery-bold, #6366f1)` | Catalyst indigo primary |
| `#4338ca` | `var(--ds-background-discovery-bold, #4338ca)` | Indigo-700 |
| `#3730a3` | `var(--ds-background-discovery-bold, #3730a3)` | Indigo-800 |
| `#a5b4fc` | `var(--ds-background-discovery, #F3F0FF)` | Indigo border light |
| `#8b5cf6` / `#8B5CF6` | `var(--ds-background-discovery-bold, #8b5cf6)` | Purple Data/AI |
| `#7C3AED` / `#7c3aed` | `var(--ds-background-discovery-bold, #7C3AED)` | Purple bold |
| `#6d28d9` | `var(--ds-background-discovery-bold, #6d28d9)` | Purple-700 |
| `#5b21b6` | `var(--ds-background-discovery-bold, #5b21b6)` | Purple-800 |
| `#c4b5fd` | `var(--ds-background-discovery, #F3F0FF)` | Purple border light |
| `#ec4899` / `#EC4899` | `var(--ds-background-accent-magenta-bolder, #ec4899)` | Pink Delivery |
| `#be185d` | `var(--ds-background-accent-magenta-bolder, #be185d)` | Pink dark |
| `#9d174d` | `var(--ds-background-accent-magenta-bolder, #9d174d)` | Pink darker |
| `#f9a8d4` | `var(--ds-background-accent-magenta-subtle, #fce7f3)` | Pink border |
| `#fce7f3` | `var(--ds-background-accent-magenta-subtle, #fce7f3)` | Pink light |
| `#d97706` / `#D97706` | `var(--ds-background-warning-bold, #d97706)` | Amber/orange |
| `#b45309` | `var(--ds-background-warning-bold, #b45309)` | Amber dark |
| `#f59e0b` / `#F59E0B` | `var(--ds-background-warning-bold, #f59e0b)` | Amber-400 |
| `#ef4444` / `#EF4444` | `var(--ds-background-danger-bold, #ef4444)` | Red primary |
| `#dc2626` / `#DC2626` | `var(--ds-background-danger-bold, #dc2626)` | Red-600 |
| `#f87171` | `var(--ds-background-danger, #FFECEB)` | Red-400 light |
| `#e11d48` | `var(--ds-background-danger-bold, #e11d48)` | Rose-600 |
| `#6A9A23` / `#6a9a23` | `var(--ds-background-success-bold, #6A9A23)` | Catalyst done green |
| `#059669` / `#10b981` | `var(--ds-background-success-bold, #059669)` | Emerald bold |

---

## NEUTRAL / GREY SCALE (Tailwind + Catalyst)

| Hex Value | ADS Token | Notes |
|-----------|-----------|-------|
| `#262626` | `var(--ds-text, #172B4D)` | Dark text |
| `#404040` / `#404040` | `var(--ds-text-subtle, #44546F)` | Medium dark grey |
| `#525252` | `var(--ds-text-subtle, #44546F)` | Grey-600 |
| `#475569` / `#475569` | `var(--ds-text-subtle, #44546F)` | Slate-600 |
| `#64748b` / `#64748B` | `var(--ds-text-subtlest, #626F86)` | Slate-500 |
| `#6b7280` / `#6B7280` | `var(--ds-text-subtlest, #626F86)` | Gray-500 |
| `#737373` | `var(--ds-text-subtlest, #626F86)` | Grey-500 |
| `#94a3b8` / `#94A3B8` | `var(--ds-text-disabled, #8590A2)` | Slate-400 |
| `#a3a3a3` / `#A3A3A3` | `var(--ds-text-disabled, #8590A2)` | Grey-400 |
| `#9ca3af` / `#9CA3AF` | `var(--ds-text-disabled, #8590A2)` | Gray-400 |
| `#d4d4d4` / `#D4D4D4` | `var(--ds-background-neutral-hovered, #D4D4D4)` | Grey-300 |
| `#334155` | `var(--ds-text-subtle, #44546F)` | Slate-700 |
| `#1e293b` | `var(--ds-text, #172B4D)` | Slate-800 |
| `#0f172a` / `#0F172A` | `var(--ds-text, #172B4D)` | Slate-900 |
| `#475569` | `var(--ds-text-subtle, #44546F)` | Slate-600 |
| `#f1f5f9` / `#F1F5F9` | `var(--ds-surface-sunken, #F7F8F9)` | Slate-100 |
| `#f8fafc` / `#F8FAFC` | `var(--ds-surface-sunken, #F8FAFC)` | Slate-50 |
| `#f5f5f4` | `var(--ds-background-neutral-subtle, #F7F8F9)` | Stone-100 warm |
| `#f3f4f6` / `#F3F4F6` | `var(--ds-background-neutral-subtle, #F7F8F9)` | Gray-100 |
| `#f3f3f3` | `var(--ds-background-neutral-subtle, #F7F8F9)` | Light grey |
| `#f5f5f5` / `#F5F5F5` | `var(--ds-surface-sunken, #F7F8F9)` | Near-white |
| `#e2e8f0` / `#E2E8F0` | `var(--ds-border, #DFE1E6)` | Slate-200 border |
| `#115e59` | `var(--ds-text-success, #216E4E)` | Teal-900 text |
| `#134e4a` | `var(--ds-text-success, #216E4E)` | Teal-950 text |
| `#0f766e` | `var(--ds-chart-teal-bolder, #0f766e)` | Teal-700 |
| `#5eead4` | `var(--ds-background-success, #DCFFF1)` | Teal-300 light |

---

## WORKSTREAM EXTRAS

| Hex Value | ADS Token | Notes |
|-----------|-----------|-------|
| `#f97316` | `var(--ds-background-warning-bold, #f97316)` | Orange-500 Tahommona |
| `#ffedd5` | `var(--ds-background-warning, #FFF7D6)` | Orange-100 |
| `#fdba74` | `var(--ds-background-warning, #FFF7D6)` | Orange border |
| `#c2410c` | `var(--ds-text-danger, #AE2A19)` | Orange-700 |
| `#9a3412` | `var(--ds-text-danger, #AE2A19)` | Orange-800 |
| `#c9a227` | `var(--ds-background-warning-bold, #E2B203)` | Gold/amber |
| `#0284c7` | `var(--ds-link, #0284c7)` | Sky-600 |
| `#5eead4` | `var(--ds-background-success, #DCFFF1)` | Teal-300 |
| `#ffb020` | `var(--ds-background-warning-bold, #E2B203)` | Amber warning |
| `#1868DB` | `var(--ds-link, #1868DB)` | Jira brand blue |

---

## RGBA PATTERNS

| Value Pattern | ADS Token | Notes |
|---------------|-----------|-------|
| `rgba(239, 68, 68, 0.X)` | `var(--ds-background-danger, rgba(239,68,68,0.X))` | Red with alpha |
| `rgba(239,68,68,0.X)` | `var(--ds-background-danger, rgba(239,68,68,0.X))` | Red alpha compact |
| `rgba(217, 119, 6, 0.X)` | `var(--ds-background-warning, rgba(217,119,6,0.X))` | Orange with alpha |
| `rgba(217,119,6,0.X)` | `var(--ds-background-warning, rgba(217,119,6,0.X))` | Orange alpha compact |
| `rgba(37, 99, 235, 0.X)` | `var(--ds-background-information, rgba(37,99,235,0.X))` | Blue with alpha |
| `rgba(37,99,235,0.X)` | `var(--ds-background-information, rgba(37,99,235,0.X))` | Blue alpha compact |
| `rgba(13, 148, 136, 0.X)` | `var(--ds-background-success, rgba(13,148,136,0.X))` | Teal with alpha |
| `rgba(13,148,136,0.X)` | `var(--ds-background-success, rgba(13,148,136,0.X))` | Teal alpha compact |
| `rgba(148, 163, 184, 0.X)` | `var(--ds-background-neutral, rgba(148,163,184,0.X))` | Slate with alpha |
| `rgba(148,163,184,0.X)` | `var(--ds-background-neutral, rgba(148,163,184,0.X))` | Slate alpha compact |
| `rgba(203, 213, 225, 0.X)` | `var(--ds-background-neutral, rgba(203,213,225,0.X))` | Slate-300 alpha |
| `rgba(203,213,225,0.X)` | `var(--ds-background-neutral, rgba(203,213,225,0.X))` | Slate-300 alpha compact |
| `rgba(225, 29, 72, 0.X)` | `var(--ds-background-danger, rgba(225,29,72,0.X))` | Rose with alpha |
| `rgba(225,29,72,0.X)` | `var(--ds-background-danger, rgba(225,29,72,0.X))` | Rose alpha compact |

---

## WHITE IN TEXT CONTEXT

When `#FFFFFF` / `#fff` appears as text color (text-on-dark buttons, badges):

| Context | ADS Token |
|---------|-----------|
| `color: #ffffff` on dark bg | `var(--ds-text-inverse, #FFFFFF)` |
| `background: #ffffff` | `var(--ds-surface, #FFFFFF)` |
| `fill: #ffffff` (SVG) | `var(--ds-text-inverse, #FFFFFF)` |

---

## SHADOW / ELEVATION

| Value | ADS Token | Notes |
|-------|-----------|-------|
| `0 1px 3px rgba(0,0,0,0.1)` | `var(--ds-shadow-raised, 0 1px 3px rgba(0,0,0,0.1))` | Raised shadow |
| `0 4px 8px rgba(0,0,0,0.15)` | `var(--ds-shadow-overlay, 0 4px 8px rgba(0,0,0,0.15))` | Overlay shadow |
| `0 8px 28px rgba(9,30,66,0.25)` | `var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))` | Jira overlay shadow |
| `0 1px 1px rgba(9,30,66,0.25)` | `var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.25))` | Raised ADS |

---

## CONFIDENCE LEVELS

- **100%** — Exact Jira DOM probe match
- **95%** — ADS canonical (atlassian.design token spec)
- **75%** — Best semantic match, no exact probe
- **REVIEW** — Catalyst brand color, no ADS equivalent; keeps original as fallback
