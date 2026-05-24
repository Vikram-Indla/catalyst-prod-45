import { useEffect, useRef, useState } from 'react';

export interface ImageSelection {
  wrapperEl: HTMLElement;
  top: number;
  centerX: number;
  version: number;
}

interface ControllerOptions {
  editorRootRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
}

export function useImageToolbarController({ editorRootRef, enabled }: ControllerOptions) {
  const [selection, setSelection] = useState<ImageSelection | null>(null);
  const selectionRef = useRef<ImageSelection | null>(null);
  selectionRef.current = selection;
  const versionRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const root = editorRootRef.current;
    if (!root) return;

    let rafId = 0;
    const sync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const selectedNode = root.querySelector<HTMLElement>('.ProseMirror-selectednode');
        if (!selectedNode) {
          const active = document.activeElement;
          if (
            selectionRef.current &&
            active instanceof HTMLElement &&
            !root.contains(active) &&
            (active.tagName === 'INPUT' ||
              active.tagName === 'TEXTAREA' ||
              active.closest('[role="menu"], [role="toolbar"]') != null)
          ) {
            return;
          }
          if (selectionRef.current) setSelection(null);
          return;
        }
        const wrapper = selectedNode.matches('[data-media-vc-wrapper]')
          ? selectedNode
          : selectedNode.querySelector<HTMLElement>('[data-media-vc-wrapper]');
        if (!wrapper) {
          if (selectionRef.current) setSelection(null);
          return;
        }
        const rootRect = root.getBoundingClientRect();
        const img = wrapper.querySelector<HTMLImageElement>('img[data-catalyst-injected="true"]') ?? wrapper;
        const imgRect = img.getBoundingClientRect();
        const top = imgRect.bottom - rootRect.top + 6;
        const centerX = (imgRect.left + imgRect.right) / 2 - rootRect.left;
        const cur = selectionRef.current;
        if (cur && cur.wrapperEl === wrapper && Math.abs(cur.top - top) < 0.5 && Math.abs(cur.centerX - centerX) < 0.5) {
          return;
        }
        versionRef.current += 1;
        setSelection({ wrapperEl: wrapper, top, centerX, version: versionRef.current });
      });
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    const onWinScroll = () => sync();
    window.addEventListener('scroll', onWinScroll, true);
    window.addEventListener('resize', onWinScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onWinScroll, true);
      window.removeEventListener('resize', onWinScroll);
      cancelAnimationFrame(rafId);
    };
  }, [enabled, editorRootRef]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionRef.current) {
        setSelection(null);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [enabled]);

  return {
    selection,
    dismiss: () => setSelection(null),
  };
}
