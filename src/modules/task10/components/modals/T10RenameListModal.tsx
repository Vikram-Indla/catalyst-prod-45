// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ RENAME LIST MODAL
// Professional modal with proper header/footer structure
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUpdateT10List } from '../../hooks';
import type { T10ListRow } from '../../types';

interface T10RenameListModalProps {
  isOpen: boolean;
  list: T10ListRow | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function T10RenameListModal({ isOpen, list, onClose, onSuccess }: T10RenameListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const updateList = useUpdateT10List();

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
    }
  }, [list]);

  if (!isOpen || !list) return null;

  const isChanged = name !== list.name || description !== (list.description || '');

  const handleSave = async () => {
    if (!name.trim() || !isChanged) return;

    try {
      await updateList.mutateAsync({
        listId: list.id,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to rename list:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Rename List</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              List Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              placeholder="Enter list name"
              autoFocus
            />
          </div>
          
          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
              placeholder="Add a description..."
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={updateList.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !isChanged || updateList.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateList.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default T10RenameListModal;
