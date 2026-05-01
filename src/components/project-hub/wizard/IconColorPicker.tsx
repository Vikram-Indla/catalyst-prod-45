import {
  Rocket, BarChart, Shield, FileText, Settings, Folder, Lightbulb, Target,
} from 'lucide-react';

const ICONS = [
  { name: 'rocket', Icon: Rocket },
  { name: 'bar-chart', Icon: BarChart },
  { name: 'shield', Icon: Shield },
  { name: 'file-text', Icon: FileText },
  { name: 'settings', Icon: Settings },
  { name: 'folder', Icon: Folder },
  { name: 'lightbulb', Icon: Lightbulb },
  { name: 'target', Icon: Target },
];

const COLORS = [
  'var(--ds-text-brand, #2563EB)', '#0D9488', '#7C3AED', 'var(--ds-text-danger, #DC2626)',
  '#EA580C', 'var(--ds-text-warning, #D97706)', 'var(--ds-text-success, #16A34A)', '#0284C7',
];

interface IconColorPickerProps {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

export function IconColorPicker({ icon, color, onIconChange, onColorChange }: IconColorPickerProps) {
  return (
    <div className="space-y-4">
      {/* Icon picker */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>
          Icon
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {ICONS.map(({ name, Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => onIconChange(name)}
              className="flex items-center justify-center rounded-md transition-all"
              style={{
                width: 36,
                height: 50,
                backgroundColor: icon === name ? 'var(--cp-blue-wash)' : 'var(--bg-1)',
                border: icon === name ? '2px solid var(--cp-blue)' : '1px solid var(--divider)',
                cursor: 'pointer',
              }}
            >
              <Icon size={18} color={icon === name ? 'var(--cp-blue)' : 'var(--fg-3)'} strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>
          Color
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className="flex items-center justify-center rounded-full transition-all"
              style={{
                width: 28,
                height: 28,
                backgroundColor: c,
                border: color === c ? '3px solid var(--fg-1)' : '2px solid transparent',
                cursor: 'pointer',
                boxShadow: color === c ? `inset 0 0 0 3px var(--cp-float)` : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
