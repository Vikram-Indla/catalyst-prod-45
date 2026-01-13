/**
 * Annotation State Management Hook
 * TC-231 to TC-245: Undo/redo and history management
 */

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Annotation, 
  AnnotationState, 
  AnnotationTool, 
  AnnotationColor,
  RectangleAnnotation,
  ArrowAnnotation,
  TextAnnotation,
  BlurAnnotation,
  HighlightAnnotation,
  FreehandAnnotation,
  Point
} from './types';

const MAX_HISTORY = 50;

const initialState: AnnotationState = {
  annotations: [],
  selectedId: null,
  currentTool: 'select',
  currentColor: 'red',
  strokeWidth: 2,
  fontSize: 16,
  history: [[]],
  historyIndex: 0,
};

export function useAnnotationState() {
  const [state, setState] = useState<AnnotationState>(initialState);

  const pushHistory = useCallback((newAnnotations: Annotation[]) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push([...newAnnotations]);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      
      return {
        ...prev,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const setTool = useCallback((tool: AnnotationTool) => {
    setState(prev => ({ ...prev, currentTool: tool, selectedId: null }));
  }, []);

  const setColor = useCallback((color: AnnotationColor) => {
    setState(prev => ({ ...prev, currentColor: color }));
  }, []);

  const setStrokeWidth = useCallback((width: number) => {
    setState(prev => ({ ...prev, strokeWidth: width }));
  }, []);

  const setFontSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, fontSize: size }));
  }, []);

  const selectAnnotation = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedId: id }));
  }, []);

  const addRectangle = useCallback((x: number, y: number, width: number, height: number, filled = false) => {
    const annotation: RectangleAnnotation = {
      id: uuidv4(),
      type: 'rectangle',
      color: state.currentColor,
      strokeWidth: state.strokeWidth,
      opacity: 1,
      createdAt: Date.now(),
      x, y, width, height, filled,
    };
    pushHistory([...state.annotations, annotation]);
    return annotation.id;
  }, [state.annotations, state.currentColor, state.strokeWidth, pushHistory]);

  const addArrow = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    const annotation: ArrowAnnotation = {
      id: uuidv4(),
      type: 'arrow',
      color: state.currentColor,
      strokeWidth: state.strokeWidth,
      opacity: 1,
      createdAt: Date.now(),
      startX, startY, endX, endY,
    };
    pushHistory([...state.annotations, annotation]);
    return annotation.id;
  }, [state.annotations, state.currentColor, state.strokeWidth, pushHistory]);

  const addText = useCallback((x: number, y: number, text: string) => {
    const annotation: TextAnnotation = {
      id: uuidv4(),
      type: 'text',
      color: state.currentColor,
      strokeWidth: state.strokeWidth,
      opacity: 1,
      createdAt: Date.now(),
      x, y, text,
      fontSize: state.fontSize,
      fontFamily: 'Arial',
    };
    pushHistory([...state.annotations, annotation]);
    return annotation.id;
  }, [state.annotations, state.currentColor, state.strokeWidth, state.fontSize, pushHistory]);

  const addBlur = useCallback((x: number, y: number, width: number, height: number, blurAmount = 10) => {
    const annotation: BlurAnnotation = {
      id: uuidv4(),
      type: 'blur',
      color: 'black',
      strokeWidth: 0,
      opacity: 1,
      createdAt: Date.now(),
      x, y, width, height, blurAmount,
    };
    pushHistory([...state.annotations, annotation]);
    return annotation.id;
  }, [state.annotations, pushHistory]);

  const addHighlight = useCallback((x: number, y: number, width: number, height: number) => {
    const annotation: HighlightAnnotation = {
      id: uuidv4(),
      type: 'highlight',
      color: state.currentColor,
      strokeWidth: 0,
      opacity: 0.3,
      createdAt: Date.now(),
      x, y, width, height,
    };
    pushHistory([...state.annotations, annotation]);
    return annotation.id;
  }, [state.annotations, state.currentColor, pushHistory]);

  const addFreehand = useCallback((points: Point[]) => {
    const annotation: FreehandAnnotation = {
      id: uuidv4(),
      type: 'freehand',
      color: state.currentColor,
      strokeWidth: state.strokeWidth,
      opacity: 1,
      createdAt: Date.now(),
      points,
    };
    pushHistory([...state.annotations, annotation]);
    return annotation.id;
  }, [state.annotations, state.currentColor, state.strokeWidth, pushHistory]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    const newAnnotations = state.annotations.map(a => 
      a.id === id ? { ...a, ...updates } as Annotation : a
    );
    pushHistory(newAnnotations);
  }, [state.annotations, pushHistory]);

  const deleteAnnotation = useCallback((id: string) => {
    const newAnnotations = state.annotations.filter(a => a.id !== id);
    pushHistory(newAnnotations);
    setState(prev => ({ ...prev, selectedId: null }));
  }, [state.annotations, pushHistory]);

  const deleteSelected = useCallback(() => {
    if (state.selectedId) {
      deleteAnnotation(state.selectedId);
    }
  }, [state.selectedId, deleteAnnotation]);

  const clearAll = useCallback(() => {
    pushHistory([]);
    setState(prev => ({ ...prev, selectedId: null }));
  }, [pushHistory]);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        annotations: [...prev.history[newIndex]],
        historyIndex: newIndex,
        selectedId: null,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        annotations: [...prev.history[newIndex]],
        historyIndex: newIndex,
        selectedId: null,
      };
    });
  }, []);

  const canUndo = useMemo(() => state.historyIndex > 0, [state.historyIndex]);
  const canRedo = useMemo(() => state.historyIndex < state.history.length - 1, [state.historyIndex, state.history.length]);

  const loadAnnotations = useCallback((annotations: Annotation[]) => {
    setState({
      ...initialState,
      annotations,
      history: [annotations],
      historyIndex: 0,
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    setTool,
    setColor,
    setStrokeWidth,
    setFontSize,
    selectAnnotation,
    addRectangle,
    addArrow,
    addText,
    addBlur,
    addHighlight,
    addFreehand,
    updateAnnotation,
    deleteAnnotation,
    deleteSelected,
    clearAll,
    undo,
    redo,
    canUndo,
    canRedo,
    loadAnnotations,
    reset,
  };
}
