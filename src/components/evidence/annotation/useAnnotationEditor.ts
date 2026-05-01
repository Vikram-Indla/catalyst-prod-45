// ═══════════════════════════════════════════════════════════════════════════
// ANNOTATION EDITOR HOOK
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { Annotation, Tool } from './types';

const MAX_HISTORY_SIZE = 50;

export const useAnnotationEditor = (existingAnnotations: Annotation[]) => {
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations);
  const [activeTool, setActiveTool] = useState<Tool>('arrow');
  const [activeColor, setActiveColor] = useState('var(--ds-text-danger, #ef4444)');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // History for undo/redo
  const [history, setHistory] = useState<Annotation[][]>([existingAnnotations]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Track initial state for hasChanges calculation
  const initialAnnotationsRef = useRef<Annotation[]>(existingAnnotations);

  // Initialize history with loaded annotations
  const initializeHistory = useCallback((loadedAnnotations: Annotation[]) => {
    setHistory([loadedAnnotations]);
    setHistoryIndex(0);
    initialAnnotationsRef.current = loadedAnnotations;
  }, []);

  // Push current state to history
  const pushHistory = useCallback((newAnnotations: Annotation[]) => {
    setHistory(prev => {
      // Truncate redo stack
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
      setSelectedId(null);
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
      setSelectedId(null);
    }
  }, [historyIndex, history]);

  // Clear all annotations
  const handleClear = useCallback(() => {
    if (annotations.length > 0) {
      const newAnnotations: Annotation[] = [];
      setAnnotations(newAnnotations);
      pushHistory(newAnnotations);
      setSelectedId(null);
    }
  }, [annotations.length, pushHistory]);

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

  // Calculate if there are unsaved changes
  const hasChanges = useCallback(() => {
    const initial = initialAnnotationsRef.current;
    
    // Different length means changes
    if (annotations.length !== initial.length) return true;
    
    // Check if any annotation differs
    return annotations.some((a, i) => {
      const orig = initial[i];
      if (!orig) return true;
      return a.id !== orig.id || 
             JSON.stringify(a.points) !== JSON.stringify(orig.points) ||
             a.color !== orig.color ||
             a.text !== orig.text;
    });
  }, [annotations]);

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
        e.preventDefault();
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
    initializeHistory,
    hasChanges: hasChanges()
  };
};
