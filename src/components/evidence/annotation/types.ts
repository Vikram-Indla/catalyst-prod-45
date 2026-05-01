// ═══════════════════════════════════════════════════════════════════════════
// ANNOTATION EDITOR TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Annotation {
  id: string;
  type: 'arrow' | 'rectangle' | 'circle' | 'text' | 'freehand' | 'blur' | 'highlight';
  points: { x: number; y: number }[];  // Percentages 0-100
  color: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  filled?: boolean;
  blurIntensity?: number;
  createdAt: string;
}

export type Tool = 'arrow' | 'rectangle' | 'circle' | 'text' | 'freehand' | 'blur' | 'highlight' | 'select';

export interface Point {
  x: number;
  y: number;
}

export interface AnnotationEditorProps {
  attachmentId: string;
  imageUrl: string;
  existingAnnotations: Annotation[];
  onSave: (annotations: Annotation[]) => void;
  onCancel: () => void;
}

export interface ToolbarProps {
  activeTool: Tool;
  activeColor: string;
  strokeWidth: number;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export const COLORS = [
  { value: 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))', label: 'Red' },
  { value: 'var(--ds-text-warning, var(--ds-text-warning, #d97706))', label: 'Orange' },
  { value: '#0d9488', label: 'Teal' },
  { value: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))', label: 'Blue' },
] as const;

export const STROKE_WIDTHS = [2, 3, 4, 6] as const;

export const TOOLS = [
  { id: 'select' as const, label: 'Select', shortcut: 'V' },
  { id: 'arrow' as const, label: 'Arrow', shortcut: '1' },
  { id: 'rectangle' as const, label: 'Rectangle', shortcut: '2' },
  { id: 'circle' as const, label: 'Circle', shortcut: '3' },
  { id: 'text' as const, label: 'Text', shortcut: '4' },
  { id: 'freehand' as const, label: 'Freehand', shortcut: '5' },
  { id: 'blur' as const, label: 'Blur', shortcut: '6' },
  { id: 'highlight' as const, label: 'Highlight', shortcut: '7' },
] as const;
