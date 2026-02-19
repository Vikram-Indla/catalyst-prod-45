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
  Subtask: { color: '#64748B', icon: 'CornerDownRight' },
};

interface TypeHierarchyProps {
  featureLayerEnabled: boolean;
}

function Badge({ name }: { name: string }) {
  const cfg = TYPE_CONFIG[name] || { color: '#64748B', icon: 'Zap' };
  const IconComp = ICON_MAP[cfg.icon] || Zap;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', background: `${cfg.color}15`, color: cfg.color }}
    >
      <IconComp size={12} strokeWidth={2.5} />
      {name}
    </span>
  );
}

export function TypeHierarchy({ featureLayerEnabled }: TypeHierarchyProps) {
  const connectorStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    color: '#CBD5E1',
    userSelect: 'none',
  };

  return (
    <div
      className="rounded-xl"
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>
        Type Hierarchy
      </h3>

      <div className="space-y-2" style={{ paddingLeft: 4 }}>
        {/* Epic */}
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
