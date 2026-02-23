/**
 * CreateDriveModal — Create Innovation Drive modal
 * Single-page form with emoji picker, status toggle, date picker, stepper
 */
import React, { useState, useCallback } from 'react';
import { X, Minus, Plus, Loader2, CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CreateDriveModalProps {
  open: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🏛️', '🤖', '🌿', '🚀', '💡', '🎯', '📊', '🔬'];

interface FormErrors {
  title?: string;
  description?: string;
  deadline?: string;
  target_count?: string;
}

export default function CreateDriveModal({ open, onClose }: CreateDriveModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🏛️');
  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [deadline, setDeadline] = useState<Date>(addDays(new Date(), 30));
  const [targetCount, setTargetCount] = useState(10);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback((): FormErrors => {
    const e: FormErrors = {};
    if (!title.trim() || title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (title.trim().length > 100) e.title = 'Title must be 100 characters or less';
    if (!description.trim() || description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (description.trim().length > 500) e.description = 'Description must be 500 characters or less';
    if (!deadline || deadline <= new Date()) e.deadline = 'Deadline must be a future date';
    if (targetCount < 1 || targetCount > 50) e.target_count = 'Must be between 1 and 50';
    return e;
  }, [title, description, deadline, targetCount]);

  const isValid = Object.keys(validate()).length === 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const fullTitle = `${emoji} ${title.trim()}`;
      const { error } = await supabase
        .from('ph_innovation_drives')
        .insert({
          title: fullTitle,
          description: description.trim(),
          status,
          deadline: format(deadline, 'yyyy-MM-dd'),
          target_count: targetCount,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-innovation-drives'] });
      toast({ title: 'Innovation drive created successfully' });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({ title: true, description: true, deadline: true, target_count: true });
    if (Object.keys(validationErrors).length === 0) {
      createMutation.mutate();
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  if (!open) return null;

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 500, color: '#64748B',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px',
    padding: '8px 12px', fontSize: '14px', color: '#0F172A', outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };
  const errorStyle: React.CSSProperties = {
    fontSize: '12px', color: '#EF4444', marginTop: '4px',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '640px', maxHeight: '90vh', background: '#FFFFFF',
        borderRadius: '16px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Create Innovation Drive
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
              padding: '4px', borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              style={{ ...inputStyle, ...(touched.title && errors.title ? { borderColor: '#EF4444' } : {}) }}
              placeholder="e.g., AI & Automation Innovation Sprint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur('title')}
              onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
              maxLength={100}
            />
            {touched.title && errors.title && <div style={errorStyle}>{errors.title}</div>}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              rows={3}
              style={{
                ...inputStyle, resize: 'none',
                ...(touched.description && errors.description ? { borderColor: '#EF4444' } : {}),
              }}
              placeholder="Describe the theme and goals of this innovation drive..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleBlur('description')}
              onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
              maxLength={500}
            />
            {touched.description && errors.description && <div style={errorStyle}>{errors.description}</div>}
          </div>

          {/* Icon Emoji Picker */}
          <div>
            <label style={labelStyle}>Icon</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  style={{
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', borderRadius: '8px', cursor: 'pointer',
                    border: emoji === em ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: emoji === em ? '#EFF6FF' : '#FFFFFF',
                    boxShadow: emoji === em ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Status Toggle */}
          <div>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['active', 'draft'] as const).map((s) => {
                const isSelected = status === s;
                const dotColor = s === 'active' ? '#16A34A' : '#A1A1AA';
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 600,
                      border: isSelected ? (s === 'active' ? '1px solid #86EFAC' : '1px solid #D4D4D8') : '1px solid #E2E8F0',
                      background: isSelected ? (s === 'active' ? '#DCFCE7' : '#F4F4F5') : '#FFFFFF',
                      color: isSelected ? (s === 'active' ? '#15803D' : '#71717A') : '#94A3B8',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: isSelected ? dotColor : '#CBD5E1',
                    }} />
                    {s === 'active' ? 'Active' : 'Draft'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deadline — shadcn Calendar */}
          <div>
            <label style={labelStyle}>Deadline</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  style={{
                    ...inputStyle,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', textAlign: 'left',
                    ...(touched.deadline && errors.deadline ? { borderColor: '#EF4444' } : {}),
                  }}
                >
                  <CalendarIcon size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                  <span>{format(deadline, 'MMM d, yyyy')}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 400 }}>
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={(d) => { if (d) { setDeadline(d); handleBlur('deadline'); } }}
                  disabled={(d) => d <= new Date()}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            {touched.deadline && errors.deadline && <div style={errorStyle}>{errors.deadline}</div>}
          </div>

          {/* Target Ideas Stepper */}
          <div>
            <label style={labelStyle}>Target Ideas</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <button
                type="button"
                onClick={() => setTargetCount(Math.max(1, targetCount - 1))}
                style={{
                  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #E2E8F0', borderRadius: '8px 0 0 8px', background: '#F8FAFC',
                  cursor: targetCount <= 1 ? 'not-allowed' : 'pointer', color: targetCount <= 1 ? '#CBD5E1' : '#334155',
                }}
                disabled={targetCount <= 1}
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min={1}
                max={50}
                value={targetCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) setTargetCount(Math.min(50, Math.max(1, v)));
                }}
                onBlur={() => handleBlur('target_count')}
                style={{
                  width: '60px', height: '36px', border: '1px solid #E2E8F0', borderLeft: 'none', borderRight: 'none',
                  textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#0F172A', outline: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
              <button
                type="button"
                onClick={() => setTargetCount(Math.min(50, targetCount + 1))}
                style={{
                  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #E2E8F0', borderRadius: '0 8px 8px 0', background: '#F8FAFC',
                  cursor: targetCount >= 50 ? 'not-allowed' : 'pointer', color: targetCount >= 50 ? '#CBD5E1' : '#334155',
                }}
                disabled={targetCount >= 50}
              >
                <Plus size={14} />
              </button>
            </div>
            {touched.target_count && errors.target_count && <div style={errorStyle}>{errors.target_count}</div>}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px', fontSize: '13px', fontWeight: 600,
              color: '#64748B', background: 'transparent', border: 'none',
              borderRadius: '8px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || createMutation.isPending}
            style={{
              padding: '8px 20px', fontSize: '13px', fontWeight: 600,
              color: '#FFFFFF', background: (!isValid || createMutation.isPending) ? '#93C5FD' : '#2563EB',
              border: 'none', borderRadius: '8px',
              cursor: (!isValid || createMutation.isPending) ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.15s',
            }}
          >
            {createMutation.isPending && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Create Drive
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
