/**
 * IconPickerGrid — selectable grid of SVG entity icons.
 *
 * Replaces ad-hoc colour swatches in the create-product / create-project forms
 * with the canonical bundled SVG icon sets. Icons are sourced via Vite glob so
 * the grid auto-includes every SVG in the directory (no per-file import list)
 * and excludes PNG / non-SVG assets automatically.
 *
 * Sets exported:
 *   PRODUCT_ICONS — src/assets/icons/products/*.svg        (20)
 *   PROJECT_ICONS — src/assets/icons/project-avatars/*.svg (20, PNGs excluded)
 */

export interface EntityIcon {
  key: string; // filename stem, stored in DB (products.icon_key / ph_projects.icon)
  label: string;
  url: string;
}

function buildSet(
  mods: Record<string, string>,
): EntityIcon[] {
  return Object.entries(mods)
    .map(([path, url]) => {
      const file = path.split('/').pop() || '';
      const key = file.replace(/\.svg$/i, '');
      const label = key
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return { key, label, url };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

// eager + ?url → each module's default export is the built asset URL string
const productMods = import.meta.glob('../../assets/icons/products/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const projectMods = import.meta.glob('../../assets/icons/project-avatars/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const PRODUCT_ICONS: EntityIcon[] = buildSet(productMods);
export const PROJECT_ICONS: EntityIcon[] = buildSet(projectMods);

interface IconPickerGridProps {
  icons: EntityIcon[];
  value: string | null;
  onChange: (key: string) => void;
  /** Tile edge in px. Default 44 — small but legible. */
  tile?: number;
  testIdPrefix?: string;
}

export function IconPickerGrid({
  icons,
  value,
  onChange,
  tile = 44,
  testIdPrefix = 'icon-pick',
}: IconPickerGridProps) {
  return (
    <div
      role="listbox"
      aria-label="Icon"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
    >
      {icons.map((ic) => {
        const selected = value === ic.key;
        return (
          <button
            key={ic.key}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={ic.label}
            title={ic.label}
            data-testid={`${testIdPrefix}-${ic.key}`}
            onClick={() => onChange(ic.key)}
            style={{
              width: tile,
              height: tile,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
              borderRadius: 8,
              cursor: 'pointer',
              background: selected
                ? 'var(--ds-background-selected, #E9F2FE)'
                : 'var(--ds-surface, #FFFFFF)',
              border: selected
                ? '2px solid var(--ds-border-selected, #0C66E4)'
                : '1px solid var(--ds-border, #DFE1E6)',
              transition: 'background 100ms ease, border-color 100ms ease',
            }}
            onMouseEnter={(e) => {
              if (selected) return;
              e.currentTarget.style.background =
                'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
            }}
            onMouseLeave={(e) => {
              if (selected) return;
              e.currentTarget.style.background = 'var(--ds-surface, #FFFFFF)';
            }}
          >
            <img
              src={ic.url}
              alt=""
              aria-hidden
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </button>
        );
      })}
    </div>
  );
}
