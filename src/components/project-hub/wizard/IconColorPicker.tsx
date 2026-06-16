import { IconPickerGrid, PROJECT_ICONS } from '@/components/shared/IconPickerGrid';

interface IconColorPickerProps {
  icon: string;
  /** Retained for caller compatibility; colour selection removed from the form. */
  color?: string;
  onIconChange: (icon: string) => void;
  onColorChange?: (color: string) => void;
}

export function IconColorPicker({ icon, onIconChange }: IconColorPickerProps) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>
        Icon
      </label>
      <IconPickerGrid
        icons={PROJECT_ICONS}
        value={icon}
        onChange={onIconChange}
        testIdPrefix="project-icon"
      />
    </div>
  );
}
