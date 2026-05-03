import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import type { DescriptionMention } from './description.types';

interface DescriptionEditModeProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  charCount: number;
  isNearLimit: boolean;
  error?: string;
  isLoading: boolean;
  mentions: DescriptionMention[];
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function DescriptionEditMode({
  value,
  onChange,
  placeholder,
  maxLength,
  charCount,
  isNearLimit,
  error,
  isLoading,
  mentions,
  onSave,
  onCancel,
}: DescriptionEditModeProps) {
  return (
    <div className="space-y-3">
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={isLoading}
        className={`w-full min-h-[120px] px-3 py-2 text-sm leading-relaxed bg-white dark:bg-neutral-950 border rounded-md transition-colors resize-vertical focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-0 ${
          error
            ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
            : isNearLimit
              ? 'border-yellow-500 dark:border-yellow-400 focus:ring-yellow-500'
              : 'border-neutral-300 dark:border-neutral-600 focus:ring-blue-500'
        }`}
        aria-label="Description"
        aria-invalid={!!error}
        aria-describedby={error ? 'description-error' : undefined}
      />

      {/* Error Message */}
      {error && (
        <div
          id="description-error"
          className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          role="alert"
        >
          ⚠️ {error}
        </div>
      )}

      {/* Character Counter */}
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex gap-2">
          <span>
            {charCount} / {maxLength} characters
          </span>
          {isNearLimit && <span className="text-yellow-600 dark:text-yellow-400">⚠️ Limit approaching</span>}
          {mentions.length > 0 && <span>• {mentions.length} mention(s) detected</span>}
        </div>
      </div>

      {/* Markdown Hint */}
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        <strong>Formatting:</strong> <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">**bold**</code>{' '}
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">_italic_</code>{' '}
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">`code`</code> • @mention users and
        paste links
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Cancel editing"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Save description"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
