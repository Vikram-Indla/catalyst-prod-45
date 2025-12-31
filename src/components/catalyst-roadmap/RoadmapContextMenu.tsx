/**
 * Roadmap Context Menu - Right-click menu
 */

import React, { useEffect, useRef } from 'react';
import { Edit3, Link2, Unlink, Trash2 } from 'lucide-react';

interface RoadmapContextMenuProps {
  position: { x: number; y: number; id: string } | null;
  onClose: () => void;
  onRename: (id: string) => void;
  onAddDependency: (id: string, type: 'fs' | 'ss' | 'ff' | 'sf') => void;
  onRemoveDependencies: (id: string) => void;
}

export function RoadmapContextMenu({
  position,
  onClose,
  onRename,
  onAddDependency,
  onRemoveDependencies,
}: RoadmapContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, onClose]);

  if (!position) return null;

  return (
    <div
      ref={ref}
      className="fixed bg-surface-0 border border-border rounded-xl shadow-xl p-1.5 z-[1000] min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <ContextMenuItem 
        icon={<Edit3 className="w-3.5 h-3.5" />} 
        label="Rename" 
        onClick={() => { onRename(position.id); onClose(); }}
      />
      
      <div className="h-px bg-border my-1" />
      
      <div className="px-2.5 py-1 text-[10px] text-text-muted">Add Dependency</div>
      
      <ContextMenuItem 
        icon={<Link2 className="w-3.5 h-3.5" />} 
        label="Finish-to-Start (FS)" 
        onClick={() => { onAddDependency(position.id, 'fs'); onClose(); }}
      />
      <ContextMenuItem 
        icon={<Link2 className="w-3.5 h-3.5" />} 
        label="Start-to-Start (SS)" 
        onClick={() => { onAddDependency(position.id, 'ss'); onClose(); }}
      />
      <ContextMenuItem 
        icon={<Link2 className="w-3.5 h-3.5" />} 
        label="Finish-to-Finish (FF)" 
        onClick={() => { onAddDependency(position.id, 'ff'); onClose(); }}
      />
      <ContextMenuItem 
        icon={<Link2 className="w-3.5 h-3.5" />} 
        label="Start-to-Finish (SF)" 
        onClick={() => { onAddDependency(position.id, 'sf'); onClose(); }}
      />
      
      <div className="h-px bg-border my-1" />
      
      <ContextMenuItem 
        icon={<Unlink className="w-3.5 h-3.5" />} 
        label="Remove Dependencies" 
        onClick={() => { onRemoveDependencies(position.id); onClose(); }}
      />
    </div>
  );
}

function ContextMenuItem({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-text-secondary hover:bg-surface-1 hover:text-text-primary rounded-md transition-colors"
    >
      <span className="text-text-muted">{icon}</span>
      {label}
    </button>
  );
}
