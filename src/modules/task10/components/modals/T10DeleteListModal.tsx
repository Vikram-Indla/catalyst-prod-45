// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ DELETE LIST MODAL
// GitHub-style confirmation with name match and red warning styling
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useDeleteT10List } from '../../hooks';
import type { T10ListRow } from '../../types';

interface T10DeleteListModalProps {
  isOpen: boolean;
  list: T10ListRow | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function T10DeleteListModal({ isOpen, list, onClose, onSuccess }: T10DeleteListModalProps) {
  const [confirmName, setConfirmName] = useState('');
  
  const deleteList = useDeleteT10List();

  useEffect(() => {
    if (!isOpen) {
      setConfirmName('');
    }
  }, [isOpen]);

  if (!isOpen || !list) return null;

  const isConfirmed = confirmName === list.name;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    try {
      await deleteList.mutateAsync(list.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete list:', error);
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
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Delete List</h2>
            <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Warning Box - RED styling */}
          <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              This will permanently delete the list{' '}
              <strong>"{list.name}"</strong> ({list.list_key}), including all weeks and items associated with it.
            </p>
          </div>
          
          {/* Confirmation Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">
              Please type <strong className="font-semibold">{list.name}</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow"
              placeholder="Enter list name to confirm"
              autoFocus
              autoComplete="off"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={deleteList.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || deleteList.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {deleteList.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </span>
            ) : (
              'Delete List'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default T10DeleteListModal;
