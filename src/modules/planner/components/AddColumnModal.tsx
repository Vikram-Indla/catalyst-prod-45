// ============================================================
// ADD COLUMN MODAL
// Modal for creating new Kanban columns
// ============================================================

import { useState } from 'react';
import { X, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ColumnConfig } from '../types';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (column: Omit<ColumnConfig, 'order'>) => void;
  existingColumns: ColumnConfig[];
}

const PRESET_COLORS = [
  'var(--ds-text-subtlest, #94a3b8)', // Slate
  'var(--ds-text-brand, #3b82f6)', // Blue
  '#0d9488', // Teal
  '#10b981', // Green
  'var(--ds-text-warning, #d97706)', // Amber
  '#f97316', // Orange
  'var(--ds-text-danger, #ef4444)', // Red
  '#7c3aed', // Violet
  '#ec4899', // Pink
];

export function AddColumnModal({ isOpen, onClose, onAdd, existingColumns }: AddColumnModalProps) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Column name is required');
      return;
    }
    
    // Check for duplicate names
    if (existingColumns.some(col => col.title.toLowerCase() === trimmedTitle.toLowerCase())) {
      setError('A column with this name already exists');
      return;
    }

    // Generate a unique ID
    const id = trimmedTitle.toLowerCase().replace(/\s+/g, '-');

    onAdd({
      id,
      title: trimmedTitle,
      color,
    });

    // Reset form
    setTitle('');
    setColor(PRESET_COLORS[0]);
    setError('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setColor(PRESET_COLORS[0]);
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-background rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Add New Column</h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Column Name */}
                <div className="space-y-2">
                  <Label htmlFor="columnName" className="text-sm font-medium">
                    Column Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="columnName"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g., QA Testing, Blocked, Ready for Deploy"
                    autoFocus
                    className="h-10"
                  />
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>

                {/* Color Picker */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Color
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setColor(preset)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          color === preset 
                            ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset }}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!title.trim()}>
                    Add Column
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
