/**
 * Annotation System Types
 * TC-186 to TC-260: Annotation tools and data structures
 */

export type AnnotationTool = 'select' | 'rectangle' | 'arrow' | 'text' | 'blur' | 'highlight' | 'freehand';

export type AnnotationColor = 'red' | 'yellow' | 'green' | 'blue' | 'white' | 'black';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  type: AnnotationTool;
  color: AnnotationColor;
  strokeWidth: number;
  opacity: number;
  createdAt: number;
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface BlurAnnotation extends BaseAnnotation {
  type: 'blur';
  x: number;
  y: number;
  width: number;
  height: number;
  blurAmount: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: Point[];
}

export type Annotation = 
  | RectangleAnnotation 
  | ArrowAnnotation 
  | TextAnnotation 
  | BlurAnnotation 
  | HighlightAnnotation 
  | FreehandAnnotation;

export interface AnnotationState {
  annotations: Annotation[];
  selectedId: string | null;
  currentTool: AnnotationTool;
  currentColor: AnnotationColor;
  strokeWidth: number;
  fontSize: number;
  history: Annotation[][];
  historyIndex: number;
}

export const COLOR_VALUES: Record<AnnotationColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  white: '#ffffff',
  black: '#000000',
};

export const TOOL_ICONS: Record<AnnotationTool, string> = {
  select: 'MousePointer2',
  rectangle: 'Square',
  arrow: 'ArrowUpRight',
  text: 'Type',
  blur: 'Eraser',
  highlight: 'Highlighter',
  freehand: 'Pencil',
};
