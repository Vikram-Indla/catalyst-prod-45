// ═══════════════════════════════════════════════════════════════════════════
// ANNOTATION EDITOR HOOK
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { Annotation, Tool } from './types';

export const useAnnotationEditor = (existingAnnotations: Annotation[]) => {
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations);
  const [activeTool, setActiveTool] = useState<Tool>('arrow');
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // History for undo/redo
  const [history, setHistory] = useState<Annotation[][]>([existingAnnotations]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Push current state to history
  const pushHistory = useCallback((newAnnotations: Annotation[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newAnnotations];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setAnnotations(history[historyIndex - 1]);
      setSelectedId(null);
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setAnnotations(history[historyIndex + 1]);
      setSelectedId(null);
    }
  }, [historyIndex, history]);

  // Clear all annotations
  const handleClear = useCallback(() => {
    if (annotations.length > 0) {
      setAnnotations([]);
      pushHistory([]);
      setSelectedId(null);
    }
  }, [annotations, pushHistory]);

  // Delete selected annotation
  const handleDeleteSelected = useCallback(() => {
    if (selectedId) {
      const newAnnotations = annotations.filter(a => a.id !== selectedId);
      setAnnotations(newAnnotations);
      pushHistory(newAnnotations);
      setSelectedId(null);
    }
  }, [selectedId, annotations, pushHistory]);

  // Add completed annotation
  const addAnnotation = useCallback((annotation: Annotation) => {
    const newAnnotations = [...annotations, annotation];
    setAnnotations(newAnnotations);
    pushHistory(newAnnotations);
  }, [annotations, pushHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Tool shortcuts
      const toolMap: Record<string, Tool> = {
        'v': 'select',
        '1': 'arrow',
        '2': 'rectangle',
        '3': 'circle',
        '4': 'text',
        '5': 'freehand',
        '6': 'blur',
        '7': 'highlight',
      };

      if (toolMap[e.key.toLowerCase()]) {
        setActiveTool(toolMap[e.key.toLowerCase()]);
        return;
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        handleDeleteSelected();
        return;
      }

      // Undo/Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleDeleteSelected, handleUndo, handleRedo]);

  return {
    annotations,
    setAnnotations,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    strokeWidth,
    setStrokeWidth,
    selectedId,
    setSelectedId,
    currentAnnotation,
    setCurrentAnnotation,
    isDrawing,
    setIsDrawing,
    history,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    handleUndo,
    handleRedo,
    handleClear,
    handleDeleteSelected,
    addAnnotation,
    pushHistory,
    hasChanges: historyIndex > 0 || annotations.length !== existingAnnotations.length
  };
};
