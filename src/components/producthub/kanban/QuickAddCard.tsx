import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { InitiativeStatus } from '@/types/initiative';

interface QuickAddCardProps {
  status: InitiativeStatus;
}

export const QuickAddCard: React.FC<QuickAddCardProps> = ({ status }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const { data: existing } = await supabase
        .from('ph_initiatives' as any)
        .select('initiative_key')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 19;
      if (existing && existing.length > 0) {
        const match = (existing[0] as any).initiative_key?.match(/MIM-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }

      const { error } = await supabase
        .from('ph_initiatives' as any)
        .insert({
          title: newTitle,
          status,
          initiative_key: `MIM-${String(nextNum).padStart(3, '0')}`,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      toast.success('Initiative created');
      setTitle('');
      setIsOpen(false);
    },
    onError: () => toast.error('Failed to create initiative'),
  });

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="pk-add-card-btn">
        <Plus size={14} />
        <span>Add initiative</span>
      </button>
    );
  }

  return (
    <div className="pk-add-card-form">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') { setIsOpen(false); setTitle(''); }
        }}
        onBlur={() => {
          if (!title.trim()) { setIsOpen(false); setTitle(''); }
        }}
        placeholder="Initiative title…"
        className="pk-add-card-input"
      />
      <p className="pk-add-card-hint">Press Enter to save, Esc to cancel</p>
    </div>
  );
};
