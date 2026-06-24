# Source Icons Setup (Jira Integration)

## Overview
Three source-indicator icons for the Jira Integration admin module to show data origin (Jira, Catalyst native, Notion) on hover over titles.

**Location:** `/src/assets/icons/source/`

**Files:**
- `jira.svg` — Jira source indicator (checkmark flag, #0747A6)
- `catalyst.svg` — Catalyst native indicator (C rounded, #172B4D)
- `notion.svg` — Notion source indicator (N rounded, #000000)

## Manifest Registration (During Implementation)

Add to `manifest.json`:

```json
{
  "categories": {
    "source": {
      "viewBox": "0 0 24 24",
      "format": "svg",
      "fillStrategy": "hardcoded per-source color (Jira blue / Catalyst navy / Notion black)",
      "renderSizes": [12, 16, 20],
      "items": [
        { "id": "jira",     "label": "Jira",     "color": "#0747A6", "metaphor": "checkmark flag",      "darkVariant": null },
        { "id": "catalyst", "label": "Catalyst", "color": "#172B4D", "metaphor": "C rounded square",     "darkVariant": null },
        { "id": "notion",   "label": "Notion",   "color": "#000000", "metaphor": "N rounded square",     "darkVariant": null }
      ]
    }
  }
}
```

## Component Integration (During Implementation)

### 1. Register in `src/components/icons/icons.registry.ts`

Add to the registry:

```typescript
export const SOURCE_REGISTRY = {
  jira:     { id: 'jira',     label: 'Jira',     color: '#0747A6' },
  catalyst: { id: 'catalyst', label: 'Catalyst', color: '#172B4D' },
  notion:   { id: 'notion',   label: 'Notion',   color: '#000000' },
} as const;

export type SourceId = keyof typeof SOURCE_REGISTRY;
```

### 2. Update Admin Icons Page

Add "source" tab to `AdminIconsPage.tsx`:

```typescript
const SURFACES_BY_CATEGORY: Record<IconCategory, string[]> = {
  // ... existing
  'source': [
    'Jira Integration admin module (hover over titles)',
    'Work item detail modal (source traceability)',
    'Admin icons admin page',
  ],
};
```

### 3. Mockup Reference (JiraSyncPageMockup.tsx)

During implementation, update `SourceAwareTitle` component to use registered SVG icons:

```typescript
// Replace text icons with registered SVGs
const SOURCE_ICONS_SVG = {
  jira: () => import('@/assets/icons/source/jira.svg'),
  catalyst: () => import('@/assets/icons/source/catalyst.svg'),
  notion: () => import('@/assets/icons/source/notion.svg'),
} as const;

function SourceAwareTitle({ title, source }: {...}) {
  const [showSource, setShowSource] = useState(false);
  
  // Use SVG icon from registry on hover
  return (
    <span onMouseEnter={() => setShowSource(true)} onMouseLeave={() => setShowSource(false)}>
      {title}
      {source && showSource && (
        <img 
          src={SOURCE_ICONS_SVG[source]?.src}
          width="1em"
          height="1em"
          style={{ marginLeft: '4px', opacity: 0.7, display: 'inline' }}
        />
      )}
    </span>
  );
}
```

## Upload via Admin Panel

Once registered, admins can override source icons at `/admin/icons` → "Source" tab:

1. Click icon card → "Upload custom variant"
2. Select new SVG file
3. Icon renders across all surfaces that reference `source` category
4. Toast confirms surfaces affected: "Jira Integration admin module · Work item detail modal"

## Dark Mode Support

All three icons maintain readability in dark mode:
- **Jira** — #0747A6 (Jira brand blue, high contrast on dark surface)
- **Catalyst** — #172B4D (Catalyst navy, readable on dark)
- **Notion** — #000000 (black, readable with `opacity: 0.7` on dark bg)

No `_dark/` variants needed — hardcoded colors tested against both light and dark ADS backgrounds.
