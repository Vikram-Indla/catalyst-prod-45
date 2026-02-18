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
      // Generate next key
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
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives-mock'] });
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
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 border border-dashed border-zinc-300 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Initiative</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-blue-300 rounded-lg p-2.5 shadow-sm">
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
        className="w-full text-sm px-2 py-1.5 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      />
      <p className="text-[10px] text-zinc-400 mt-1.5 px-0.5">Press Enter to save, Esc to cancel</p>
    </div>
  );
};
