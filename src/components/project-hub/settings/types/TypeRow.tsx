import { Zap, Layers, Bookmark, Bug, CheckSquare, CornerDownRight, MoreHorizontal } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Zap, Layers, Bookmark, Bug, CheckSquare, CornerDownRight,
  'zap': Zap,
  'layers': Layers,
  'bookmark': Bookmark,
  'bug': Bug,
  'check-square': CheckSquare,
  'corner-down-right': CornerDownRight,
};

const LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  Top: { bg: '#F5F3FF', text: '#7C3AED' },
  Mid: { bg: 'var(--ds-background-selected, #EFF6FF)', text: 'var(--ds-text-brand, #2563EB)' },
  Work: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)' },
  Child: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtlest, #94A3B8)' },
  top: { bg: '#F5F3FF', text: '#7C3AED' },
  mid: { bg: 'var(--ds-background-selected, #EFF6FF)', text: 'var(--ds-text-brand, #2563EB)' },
  work: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)' },
  child: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtlest, #94A3B8)' },
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
  const IconComp = ICON_MAP[icon] || ICON_MAP[icon.toLowerCase()] || Zap;
  const normalizedLevel = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
  const ls = LEVEL_STYLES[normalizedLevel] || LEVEL_STYLES[level] || LEVEL_STYLES.Work;
  const isDisabledFeature = isFeatureType && !featureLayerEnabled;

  return (
    <div
      className="flex items-center gap-3 px-3 rounded-lg hover:bg-[var(--ds-surface-sunken,#F8FAFC)] transition-colors"
      style={{ height: 48, opacity: isDisabledFeature ? 0.5 : 1 }}
    >
      {/* Icon circle */}
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ width: 28, height: 28, background: color, borderRadius: 8 }}
      >
        <IconComp size={14} color="var(--ds-text-inverse, #FFFFFF)" strokeWidth={2.5} />
      </div>

      {/* Name */}
      <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>
        {name}
      </span>

      {/* Level badge */}
      <span
        className="flex-shrink-0 rounded-full"
        style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: ls.bg, color: ls.text }}
      >
        {normalizedLevel}
      </span>

      {/* Item count or disabled label */}
      <span className="flex-shrink-0 text-right" style={{ fontSize: 12, color: 'var(--fg-4)', minWidth: 100, fontFamily: isDisabledFeature ? 'var(--cp-font-body)' : 'var(--cp-font-mono)' }}>
        {isDisabledFeature ? (
          <span style={{ fontSize: 11, fontStyle: 'italic' }}>Disabled — enable Feature Layer</span>
        ) : (
          itemCount
        )}
      </span>

      {/* Actions */}
      <div className="relative">
        <button
          onClick={onViewFields}
          className="flex items-center justify-center rounded transition-colors hover:bg-[var(--bd-default,#E2E8F0)]"
          style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="View Fields"
        >
          <MoreHorizontal size={16} color="var(--fg-3)" />
        </button>
      </div>
    </div>
  );
}
