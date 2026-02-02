/**
 * Task¹⁰ Description Editor - Click-to-edit description field
 */
import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DescriptionEditor({ value, onChange }: DescriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    onChange(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  if (!isEditing && !value) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full px-3 py-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400 hover:border-slate-300 hover:bg-slate-100 transition-colors text-left mb-4"
      >
        Add a description...
      </button>
    );
  }

  if (isEditing) {
    return (
      <div className="mb-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a description..."
          className="w-full px-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 resize-none min-h-[100px] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-100 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 whitespace-pre-wrap cursor-pointer hover:bg-slate-100 transition-colors mb-4"
    >
      {value}
    </div>
  );
}
