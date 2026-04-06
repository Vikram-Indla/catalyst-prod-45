/**
 * CreateDriveModal — Create Innovation Drive modal
 * Lucide icon picker, status toggle, date picker, stepper
 */
import React, { useState, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import {
  X, Minus, Plus, Loader2, CalendarIcon,
  Building2, Bot, Leaf, Rocket, Lightbulb, Target, BarChart3, Microscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Building2', Icon: Building2 },
  { name: 'Bot', Icon: Bot },
  { name: 'Leaf', Icon: Leaf },
  { name: 'Rocket', Icon: Rocket },
  { name: 'Lightbulb', Icon: Lightbulb },
  { name: 'Target', Icon: Target },
  { name: 'BarChart3', Icon: BarChart3 },
  { name: 'Microscope', Icon: Microscope },
];

interface FormErrors {
  title?: string;
  description?: string;
  deadline?: string;
  target_count?: string;
}

export default function CreateDriveModal({ open, onClose }: CreateDriveModalProps) {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Building2');
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
      const fullTitle = `[${selectedIcon}] ${title.trim()}`;
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
    fontSize: '11px', fontWeight: 600, color: isDark ? '#A1A1A1' : '#475569',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block',
    fontFamily: 'Inter, sans-serif',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', border: `1.5px solid ${isDark ? '#454545' : '#CBD5E1'}`, borderRadius: '8px',
    padding: '10px 12px', fontSize: '14px', color: isDark ? '#EDEDED' : '#0F172A', outline: 'none',
    fontFamily: 'Inter, sans-serif', background: isDark ? 'transparent' : '#FFFFFF',
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
        width: '640px', maxHeight: '90vh', background: isDark ? '#1A1A1A' : '#FFFFFF',
        borderRadius: '16px', display: 'flex', flexDirection: 'column',
        boxShadow: isDark ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.25)',
        padding: '28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: 0, fontFamily: 'Inter, sans-serif' }}>
            Create Innovation Drive
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#878787' : '#64748B',
              padding: '4px', borderRadius: '6px', display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              style={{ ...inputStyle, ...(touched.title && errors.title ? { borderColor: '#EF4444' } : {}) }}
              placeholder="e.g., AI & Automation Innovation Sprint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur('title')}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
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
                ...inputStyle, resize: 'vertical', minHeight: '80px',
                ...(touched.description && errors.description ? { borderColor: '#EF4444' } : {}),
              }}
              placeholder="Describe the theme and goals of this innovation drive..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleBlur('description')}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              maxLength={500}
            />
            {touched.description && errors.description && <div style={errorStyle}>{errors.description}</div>}
          </div>

          {/* Lucide Icon Picker */}
          <div>
            <label style={labelStyle}>Icon</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {ICON_OPTIONS.map(({ name, Icon }) => {
                const isSelected = selectedIcon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedIcon(name)}
                    style={{
                      width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '8px', cursor: 'pointer',
                      border: isSelected ? '1.5px solid #2563EB' : `1.5px solid ${isDark ? '#454545' : '#E2E8F0'}`,
                      background: isSelected ? (isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF') : (isDark ? 'transparent' : '#FFFFFF'),
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = isDark ? '#454545' : '#CBD5E1'; e.currentTarget.style.background = isDark ? '#1F1F1F' : '#F8FAFC'; } }}
                    onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = isDark ? '#454545' : '#E2E8F0'; e.currentTarget.style.background = isDark ? 'transparent' : '#FFFFFF'; } }}
                  >
                    <Icon size={20} strokeWidth={1.75} color={isSelected ? '#2563EB' : (isDark ? '#A1A1A1' : '#334155')} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Toggle */}
          <div>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['active', 'draft'] as const).map((s) => {
                const isSelected = status === s;
                const isActive = s === 'active';
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '6px 16px', borderRadius: '20px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: isSelected ? 600 : 500,
                      border: isSelected
                        ? (isActive ? '1.5px solid #16A34A' : `1.5px solid ${isDark ? '#454545' : '#CBD5E1'}`)
                        : `1.5px solid ${isDark ? '#454545' : '#E2E8F0'}`,
                      background: isSelected
                        ? (isActive ? (isDark ? 'rgba(22,163,74,0.12)' : '#F0FDF4') : (isDark ? '#292929' : '#F8FAFC'))
                        : (isDark ? 'transparent' : '#FFFFFF'),
                      color: isSelected
                        ? (isActive ? (isDark ? '#86EFAC' : '#15803D') : (isDark ? '#A1A1A1' : '#64748B'))
                        : (isDark ? '#878787' : '#94A3B8'),
                      transition: 'all 150ms ease',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: isSelected
                        ? (isActive ? '#16A34A' : '#94A3B8')
                        : '#CBD5E1',
                    }} />
                    {isActive ? 'Active' : 'Draft'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deadline */}
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
                  <CalendarIcon size={16} style={{ color: isDark ? '#878787' : '#64748B', flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A' }}>{format(deadline, 'MMM d, yyyy')}</span>
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
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              border: `1.5px solid ${isDark ? '#454545' : '#CBD5E1'}`, borderRadius: '8px', overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => setTargetCount(Math.max(1, targetCount - 1))}
                style={{
                  width: '36px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', background: isDark ? 'transparent' : '#FFFFFF',
                  cursor: targetCount <= 1 ? 'not-allowed' : 'pointer',
                  color: targetCount <= 1 ? (isDark ? '#878787' : '#CBD5E1') : (isDark ? '#A1A1A1' : '#334155'),
                  fontSize: '18px', fontWeight: 500,
                }}
                disabled={targetCount <= 1}
              >
                <Minus size={16} />
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
                  width: '48px', height: '50px',
                  borderLeft: `1.5px solid ${isDark ? '#454545' : '#CBD5E1'}`, borderRight: `1.5px solid ${isDark ? '#454545' : '#CBD5E1'}`,
                  borderTop: 'none', borderBottom: 'none',
                  textAlign: 'center', fontSize: '16px', fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', outline: 'none',
                  fontFamily: 'Inter, sans-serif', background: isDark ? 'transparent' : '#FFFFFF',
                }}
              />
              <button
                type="button"
                onClick={() => setTargetCount(Math.min(50, targetCount + 1))}
                style={{
                  width: '36px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', background: isDark ? 'transparent' : '#FFFFFF',
                  cursor: targetCount >= 50 ? 'not-allowed' : 'pointer',
                  color: targetCount >= 50 ? (isDark ? '#878787' : '#CBD5E1') : (isDark ? '#A1A1A1' : '#334155'),
                  fontSize: '18px', fontWeight: 500,
                }}
                disabled={targetCount >= 50}
              >
                <Plus size={16} />
              </button>
            </div>
            {touched.target_count && errors.target_count && <div style={errorStyle}>{errors.target_count}</div>}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          paddingTop: '20px', borderTop: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, marginTop: '24px',
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 500,
              color: isDark ? '#A1A1A1' : '#475569', background: 'transparent', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? '#EDEDED' : '#0F172A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? '#A1A1A1' : '#475569'; }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || createMutation.isPending}
            style={{
              padding: '10px 24px', fontSize: '14px', fontWeight: 600,
              color: '#FFFFFF',
              background: (!isValid || createMutation.isPending) ? '#93C5FD' : '#2563EB',
              border: 'none', borderRadius: '8px',
              cursor: (!isValid || createMutation.isPending) ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'background 150ms ease', fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => { if (isValid && !createMutation.isPending) e.currentTarget.style.background = '#1D4ED8'; }}
            onMouseLeave={(e) => { if (isValid && !createMutation.isPending) e.currentTarget.style.background = '#2563EB'; }}
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
