// ═══════════════════════════════════════════════════════════════════════════
// FILE BROWSER BUTTON
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef } from 'react';
import { FolderOpen } from 'lucide-react';
import { validateFile } from '../utils/validation';

interface FileBrowserButtonProps {
  onSelect: (files: File[]) => void;
  disabled?: boolean;
}

export const FileBrowserButton: React.FC<FileBrowserButtonProps> = ({
  onSelect,
  disabled
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateFile);

    if (validFiles.length > 0) {
      onSelect(validFiles);
    }

    // Reset input for same file re-selection
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,application/pdf"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg 
                   hover:bg-primary/10 transition-colors group
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FolderOpen className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
          Browse Files
        </span>
      </button>
    </>
  );
};
