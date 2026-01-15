/**
 * Add Assignment Modal
 * Allows assigning the resource to a new project
 * Catalyst V5 Enterprise Design System
 */

import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Assignment } from '@/types/resource-allocation.types';

interface AddAssignmentModalProps {
  resourceName: string;
  existingAssignmentIds: string[];
  availableAssignments: Array<{ id: string; name: string; key?: string }>;
  onAdd: (assignment: Assignment) => void;
  onClose: () => void;
}

export function AddAssignmentModal({
  resourceName,
  existingAssignmentIds,
  availableAssignments,
  onAdd,
  onClose,
}: AddAssignmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Filter out already assigned and search
  const filteredAssignments = availableAssignments
    .filter(a => !existingAssignmentIds.includes(a.id))
    .filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.key?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // Color rotation for new assignments
  const colorKeys = ['primary', 'teal', 'orange', 'purple'] as const;
  const nextColorIndex = existingAssignmentIds.length % colorKeys.length;

  const handleAdd = () => {
    if (!selectedId) return;
    const assignment = availableAssignments.find(a => a.id === selectedId);
    if (!assignment) return;

    onAdd({
      id: assignment.id,
      name: assignment.name,
      color: colorKeys[nextColorIndex],
    });
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[1100] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div 
        className="fixed inset-0 z-[1101] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div 
          className="bg-card rounded-xl w-full max-w-[380px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] border border-border max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-assignment-title"
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="add-assignment-title" className="text-[14px] font-bold text-foreground">
                  Add Assignment
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Select a project to assign {resourceName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors -mt-1 -mr-1"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-[12px]"
                autoFocus
              />
            </div>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {filteredAssignments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm font-medium">No projects available</p>
                <p className="text-xs mt-1">All projects are already assigned</p>
              </div>
            ) : (
              filteredAssignments.map((assignment) => (
                <button
                  key={assignment.id}
                  onClick={() => setSelectedId(assignment.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                    selectedId === assignment.id
                      ? "border-primary bg-primary/[0.06] shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  {/* Color Dot */}
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#2563eb' }}
                  />
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-foreground truncate">
                      {assignment.name}
                    </div>
                    {assignment.key && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {assignment.key}
                      </div>
                    )}
                  </div>
                  
                  {/* Check */}
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    selectedId === assignment.id
                      ? "bg-primary border-primary text-white"
                      : "border-border text-transparent"
                  )}>
                    <Check className="w-3 h-3" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!selectedId}
              className="bg-[#0d9488] hover:bg-[#14b8a6] text-white"
            >
              Add to Grid
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AddAssignmentModal;
