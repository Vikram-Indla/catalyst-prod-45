// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10NewListModal
// Purpose: Create new list modal with week selection for advance planning
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getWeekOptions, formatWeekRange, type WeekOption } from '../../utils/weekCalculations';

interface T10NewListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (listId: string) => void;
}

export function T10NewListModal({ isOpen, onClose, onCreated }: T10NewListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate week options
  const weekOptions = getWeekOptions();
  const selectedWeek = weekOptions.find(w => w.offset === selectedOffset) || weekOptions[0];

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setSelectedOffset(0);
      setNameError('');
    }
  }, [isOpen]);

  // Validate name
  useEffect(() => {
    if (name.trim() === '' && nameError) {
      setNameError('List name is required');
    } else {
      setNameError('');
    }
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setNameError('List name is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Call the RPC function
      const { data, error } = await supabase.rpc('t10_create_list', {
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_week_offset: selectedOffset,
      });

      if (error) {
        console.error('[T10] Error creating list:', error);
        toast({ 
          title: 'Error', 
          description: error.message || 'Failed to create list. Please try again.', 
          variant: 'destructive' 
        });
        return;
      }

      const result = data as { 
        list_id: string; 
        list_key: string; 
        list_name: string;
        week_id: string;
        is_upcoming: boolean;
      };

      console.log('[T10] List created:', result.list_key);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['t10'] });
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
      
      toast({ 
        title: 'List created', 
        description: result.is_upcoming 
          ? `"${result.list_name}" scheduled for ${selectedWeek.dateRange}`
          : `"${result.list_name}" has been created.`
      });
      
      onCreated?.(result.list_id);
      onClose();
    } catch (err) {
      console.error('[T10] Error creating list:', err);
      toast({ 
        title: 'Error', 
        description: 'Failed to create list. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[var(--ds-border,#2E2E2E)]">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--ds-text,#EDEDED)]">Create list</h2>
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 dark:text-[var(--ds-text-subtlest,#878787)] hover:text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-[var(--ds-text-subtlest,#A1A1A1)]">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q1 Sprint Goals"
                maxLength={100}
                className={`w-full px-4 py-2.5 text-[15px] text-slate-900 dark:text-[var(--ds-text,#EDEDED)] placeholder:text-slate-400 dark:placeholder:text-[var(--ds-text-subtlest,#878787)] bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  nameError ? 'border-red-400' : 'border-slate-300 dark:border-[var(--ds-border-bold,#454545)]'
                }`}
              />
              {nameError && (
                <p className="text-sm text-red-500">{nameError}</p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-[var(--ds-text-subtlest,#A1A1A1)]">
                Description <span className="text-slate-400 dark:text-[var(--ds-text-subtlest,#878787)] font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this list for?"
                rows={2}
                className="w-full px-4 py-2.5 text-[15px] text-slate-900 dark:text-[var(--ds-text,#EDEDED)] placeholder:text-slate-400 dark:placeholder:text-[var(--ds-text-subtlest,#878787)] bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-slate-300 dark:border-[var(--ds-border-bold,#454545)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Start Week Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-900 dark:text-[var(--ds-text,#EDEDED)]">
                Start Week
              </label>
              
              <div className="border border-slate-200 dark:border-[var(--ds-border,#2E2E2E)] rounded-lg overflow-hidden">
                {weekOptions.map((week: WeekOption) => (
                  <label
                    key={week.offset}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                      selectedOffset === week.offset 
                        ? 'bg-blue-50 border-2 border-blue-500 -m-[1px] rounded-lg relative z-10'
                        : 'hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay,#1F1F1F)] border-b border-slate-100 last:border-b-0'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Radio Circle */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedOffset === week.offset
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-300 dark:border-[var(--ds-border-bold,#454545)]'
                      }`}>
                        {selectedOffset === week.offset && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      
                      {/* Label */}
                      <span className="text-[15px] font-medium text-slate-900 dark:text-[var(--ds-text,#EDEDED)]">
                        {week.label}
                      </span>
                      
                      {/* Current Badge */}
                      {week.isCurrentWeek && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-100 rounded">
                          CURRENT
                        </span>
                      )}
                    </div>
                    
                    {/* Date Range */}
                    <span className="text-sm text-slate-500">
                      {week.dateRange}
                    </span>
                    
                    <input
                      type="radio"
                      name="weekOffset"
                      value={week.offset}
                      checked={selectedOffset === week.offset}
                      onChange={() => setSelectedOffset(week.offset)}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Week Preview Banner */}
            <div className={`flex items-start gap-3 p-4 rounded-lg border ${
              selectedWeek.isUpcoming
                ? 'bg-slate-50 dark:bg-[#111111] border-slate-200 dark:border-[var(--ds-border,#2E2E2E)]'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <Calendar 
                size={20} 
                className={selectedWeek.isUpcoming ? 'text-slate-500 mt-0.5' : 'text-blue-600 mt-0.5'}
              />
              <div>
                <p className={`text-sm font-medium ${
                  selectedWeek.isUpcoming ? 'text-slate-700' : 'text-blue-900'
                }`}>
                  {selectedWeek.isUpcoming 
                    ? `Upcoming: Week of ${formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}`
                    : `Week of ${formatWeekRange(selectedWeek.weekStart, selectedWeek.weekEnd)}`
                  }
                </p>
                <p className={`text-sm mt-0.5 ${
                  selectedWeek.isUpcoming ? 'text-slate-500' : 'text-blue-700'
                }`}>
                  {selectedWeek.isUpcoming 
                    ? `This list will activate on Monday ${selectedWeek.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. You can pre-add priorities now.`
                    : 'You can start adding priorities now.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-[var(--ds-border,#2E2E2E)] bg-slate-50 dark:bg-[#111111]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-[var(--ds-text-subtlest,#A1A1A1)] bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-slate-300 dark:border-[var(--ds-border-bold,#454545)] rounded-lg hover:bg-slate-50 dark:hover:bg-[var(--ds-surface-overlay,#1F1F1F)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default T10NewListModal;
