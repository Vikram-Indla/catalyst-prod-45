/**
 * useResizableSplit — drag-to-resize state for a vertical splitter.
 *
 * Mount a 5px-wide grab strip and call `startResize(e)` from its `onMouseDown`.
 * The hook installs document-level mousemove / mouseup listeners during the
 * drag, suppresses text selection + sets the col-resize cursor on the body
 * for the duration, and tears down cleanly on mouseup.
 */
import { useCallback, useState } from 'react';

interface Options {
  initialWidth: number;
  min: number;
  /** Either a px number or a function of `window.innerWidth`. */
  max: number | ((vw: number) => number);
}

export function useResizableSplit({ initialWidth, min, max }: Options): {
  width: number;
  setWidth: (n: number) => void;
  startResize: (e: React.MouseEvent) => void;
  isResizing: boolean;
} {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setResizing] = useState(false);

  const resolveMax = useCallback(
    (vw: number) => (typeof max === 'function' ? max(vw) : max),
    [max],
  );

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = width;
      setResizing(true);
      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const vw = window.innerWidth;
        const next = Math.max(min, Math.min(resolveMax(vw), startW + dx));
        setWidth(next);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setResizing(false);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, min, resolveMax],
  );

  return { width, setWidth, startResize, isResizing };
}
