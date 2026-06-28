import { MoreHorizontal } from '@/lib/atlaskit-icons';
import { WorkItemTypeIcon } from '@/components/icons';

const LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  Top: { bg: 'var(--ds-background-discovery)', text: 'var(--cp-purple-60)' },
  Mid: { bg: 'var(--ds-background-selected)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  Work: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))' },
  Child: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' },
  top: { bg: 'var(--ds-background-discovery)', text: 'var(--cp-purple-60)' },
  mid: { bg: 'var(--ds-background-selected)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  work: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))' },
  child: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' },
};

interface TypeRowProps {
  name: string;
  icon: string;
  color: string;
  level: string;
  isEnabled: boolean;
  isFeatureType: boolean;
  featureLayerEnabled: boolean;
  itemCount: number;
  onViewFields: () => void;
}

export function TypeRow({ name, icon, color, level, isEnabled, isFeatureType, featureLayerEnabled, itemCount, onViewFields }: TypeRowProps) {
  const normalizedLevel = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
  const ls = LEVEL_STYLES[normalizedLevel] || LEVEL_STYLES[level] || LEVEL_STYLES.Work;
  const isDisabledFeature = isFeatureType && !featureLayerEnabled;

  return (
    <div
      className="flex items-center gap-3 px-3 rounded-lg hover:bg-[var(--ds-surface-sunken)] transition-colors"
      style={{ height: 48, opacity: isDisabledFeature ? 0.5 : 1 }}
    >
      {/* Work item type icon — canonical, no colored circles (A3) */}
      <WorkItemTypeIcon type={icon} size={20} />

      {/* Name */}
      <span className="flex-1 truncate" style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: 'var(--fg-1)' }}>
        {name}
      </span>

      {/* Level badge */}
      <span
        className="flex-shrink-0 rounded-full"
        style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, padding: '0px 10px', background: ls.bg, color: ls.text }}
      >
        {normalizedLevel}
      </span>

      {/* Item count or disabled label */}
      <span className="flex-shrink-0 text-right" style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--fg-4)', minWidth: 100, fontFamily: isDisabledFeature ? 'var(--cp-font-body)' : 'var(--cp-font-mono)' }}>
        {isDisabledFeature ? (
          <span style={{ fontSize: 'var(--ds-font-size-100)', fontStyle: 'italic' }}>Disabled — enable Feature Layer</span>
        ) : (
          itemCount
        )}
      </span>

      {/* Actions */}
      <div className="relative">
        <button
          onClick={onViewFields}
          className="flex items-center justify-center rounded transition-colors hover:bg-[var(--bd-default,var(--cp-border, var(--cp-bg-sunken)))]"
          style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="View Fields"
        >
          <MoreHorizontal size={16} color="var(--fg-3)" />
        </button>
      </div>
    </div>
  );
}
