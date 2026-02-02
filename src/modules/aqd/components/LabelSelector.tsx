/**
 * Task¹⁰ Label Selector - Full CRUD for labels + item label assignment
 */
import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAqdLabels } from '../hooks/useAqdLabels';
import { useAqdItemLabels } from '../hooks/useAqdItemLabels';
import type { AqdLabel } from '../types/aqd.types';

const LABEL_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Teal', value: '#14b8a6' },
];

interface LabelSelectorProps {
  itemId: string;
  listId: string;
  currentLabels: AqdLabel[];
  weekId?: string;
}

export function LabelSelector({ itemId, listId, currentLabels, weekId }: LabelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingLabel, setEditingLabel] = useState<AqdLabel | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);

  const { labels: allLabels, createLabel, deleteLabel } = useAqdLabels(listId);
  const { addLabel, removeLabel } = useAqdItemLabels(itemId, weekId);

  const currentLabelIds = new Set(currentLabels.map(l => l.id));

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) return;
    createLabel.mutate({ name: newLabelName.trim(), color: newLabelColor });
    setNewLabelName('');
    setIsCreating(false);
  };

  const handleDeleteLabel = (labelId: string) => {
    if (confirm('Delete this label? It will be removed from all items.')) {
      deleteLabel.mutate(labelId);
    }
  };

  return (
    <div className="mb-4">
      {/* Current Labels */}
      <div className="flex flex-wrap gap-2 mb-2">
        {currentLabels.map(label => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold"
            style={{ borderColor: label.color, color: label.color }}
          >
            {label.name}
            <button 
              onClick={() => removeLabel(label.id)}
              className="ml-0.5 hover:bg-slate-100 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-slate-300 rounded-full text-xs font-medium text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add label
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg shadow-lg">
          {/* Existing Labels */}
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">
              Available Labels
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {allLabels.map(label => (
                <div 
                  key={label.id}
                  className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded group"
                >
                  <button
                    onClick={() => {
                      if (currentLabelIds.has(label.id)) {
                        removeLabel(label.id);
                      } else {
                        addLabel(label.id);
                      }
                    }}
                    className="flex items-center gap-2 flex-1"
                  >
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm text-slate-700">{label.name}</span>
                    {currentLabelIds.has(label.id) && (
                      <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                    )}
                  </button>
                  
                  {/* Delete action */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDeleteLabel(label.id)}
                      className="p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
              
              {allLabels.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  No labels yet
                </p>
              )}
            </div>
          </div>

          {/* Create Form */}
          {isCreating ? (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">
                Create Label
              </div>
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label name"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none mb-2"
                autoFocus
              />
              
              {/* Color Picker */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {LABEL_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setNewLabelColor(color.value)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-transform",
                      newLabelColor === color.value && "ring-2 ring-offset-2 ring-slate-400 scale-110"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleCreateLabel}
                  disabled={!newLabelName.trim()}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewLabelName('');
                  }}
                  className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create new label
            </button>
          )}
        </div>
      )}
    </div>
  );
}
