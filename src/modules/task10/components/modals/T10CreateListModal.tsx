// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ CREATE LIST MODAL
// Professional modal with proper header/footer structure
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreateT10List } from '../../hooks';

interface T10CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (listId: string) => void;
}

export function T10CreateListModal({ isOpen, onClose, onSuccess }: T10CreateListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const createList = useCreateT10List();

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      const result = await createList.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onSuccess?.(result.id);
      handleClose();
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create New List</h2>
            <p className="text-sm text-gray-500 mt-0.5">Start a new weekly priority list</p>
          </div>
          <button 
            onClick={handleClose}
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
              placeholder="e.g., Weekly Team Priorities"
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
            onClick={handleClose}
            disabled={createList.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || createList.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createList.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </span>
            ) : (
              'Create List'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default T10CreateListModal;
