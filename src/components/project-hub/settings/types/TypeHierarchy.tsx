import { Zap, Layers, Bookmark, Bug, CheckSquare, CornerDownRight } from '@/lib/atlaskit-icons';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Zap, Layers, Bookmark, Bug, CheckSquare, CornerDownRight,
};

const TYPE_CONFIG: Record<string, { color: string; icon: string }> = {
  Epic: { color: 'var(--cp-purple-60, #7C3AED)', icon: 'Zap' },
  Feature: { color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', icon: 'Layers' },
  Story: { color: 'var(--cp-teal-60, #0D9488)', icon: 'Bookmark' },
  Bug: { color: 'var(--ds-text-danger, var(--cp-danger, #DC2626))', icon: 'Bug' },
  Task: { color: 'var(--ds-text-warning, var(--cp-warning, #D97706))', icon: 'CheckSquare' },
  Subtask: { color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))', icon: 'CornerDownRight' },
};

interface TypeHierarchyProps {
  featureLayerEnabled: boolean;
}

function Badge({ name }: { name: string }) {
  const cfg = TYPE_CONFIG[name] || { color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))', icon: 'Zap' };
  const IconComp = ICON_MAP[cfg.icon] || Zap;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, padding: '3px 10px', background: `${cfg.color}15`, color: cfg.color }}
    >
      <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 18, height: 18, background: cfg.color }}>
        <IconComp size={10} color="var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))" strokeWidth={2.5} />
      </span>
      {name}
    </span>
  );
}

export function TypeHierarchy({ featureLayerEnabled }: TypeHierarchyProps) {
  const connectorStyle: React.CSSProperties = {
    fontFamily: 'var(--cp-font-mono)',
    fontSize: 'var(--ds-font-size-300)',
    color: 'var(--divider)',
    userSelect: 'none',
  };

  return (
    <div className="ph-card">
      <h3 className="ph-card-title">Type Hierarchy</h3>

      <div className="space-y-2" style={{ paddingLeft: 4 }}>
        <div><Badge name="Epic" /></div>

        {featureLayerEnabled ? (
          <>
            <div className="flex items-center gap-2" style={{ paddingLeft: 8 }}>
              <span style={connectorStyle}>└──</span>
              <Badge name="Feature" />
            </div>
            <div className="flex items-center gap-2" style={{ paddingLeft: 40 }}>
              <span style={connectorStyle}>└──</span>
              <Badge name="Story" />
              <Badge name="Bug" />
              <Badge name="Task" />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2" style={{ paddingLeft: 8 }}>
            <span style={connectorStyle}>└──</span>
            <Badge name="Story" />
            <Badge name="Bug" />
            <Badge name="Task" />
          </div>
        )}

        <div className="flex items-center gap-2" style={{ paddingLeft: featureLayerEnabled ? 72 : 40 }}>
          <span style={connectorStyle}>└──</span>
          <Badge name="Subtask" />
        </div>
      </div>
    </div>
  );
}
