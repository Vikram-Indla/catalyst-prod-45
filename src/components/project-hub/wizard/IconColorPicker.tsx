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
  '#2563EB', '#0D9488', '#7C3AED', '#DC2626',
  '#EA580C', '#D97706', '#16A34A', '#0284C7',
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
        <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 6 }}>
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
                height: 36,
                background: icon === name ? '#EFF6FF' : '#F8FAFC',
                border: icon === name ? '2px solid #2563EB' : '1px solid #E2E8F0',
                cursor: 'pointer',
              }}
            >
              <Icon size={18} color={icon === name ? '#2563EB' : '#64748B'} strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 6 }}>
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
                background: c,
                border: color === c ? '3px solid #0F172A' : '2px solid transparent',
                cursor: 'pointer',
                boxShadow: color === c ? `inset 0 0 0 3px #FFFFFF` : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
