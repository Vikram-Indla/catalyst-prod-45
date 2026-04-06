import { Zap, Layers, Bookmark, Bug, CheckSquare, CornerDownRight } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Zap, Layers, Bookmark, Bug, CheckSquare, CornerDownRight,
};

const TYPE_CONFIG: Record<string, { color: string; icon: string }> = {
  Epic: { color: '#7C3AED', icon: 'Zap' },
  Feature: { color: '#2563EB', icon: 'Layers' },
  Story: { color: '#0D9488', icon: 'Bookmark' },
  Bug: { color: '#DC2626', icon: 'Bug' },
  Task: { color: '#D97706', icon: 'CheckSquare' },
  Subtask: { color: 'rgba(237,237,237,0.40)', icon: 'CornerDownRight' },
};

interface TypeHierarchyProps {
  featureLayerEnabled: boolean;
}

function Badge({ name }: { name: string }) {
  const cfg = TYPE_CONFIG[name] || { color: 'rgba(237,237,237,0.40)', icon: 'Zap' };
  const IconComp = ICON_MAP[cfg.icon] || Zap;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', background: `${cfg.color}15`, color: cfg.color }}
    >
      <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 18, height: 18, background: cfg.color }}>
        <IconComp size={10} color="#FFFFFF" strokeWidth={2.5} />
      </span>
      {name}
    </span>
  );
}

export function TypeHierarchy({ featureLayerEnabled }: TypeHierarchyProps) {
  const connectorStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
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
