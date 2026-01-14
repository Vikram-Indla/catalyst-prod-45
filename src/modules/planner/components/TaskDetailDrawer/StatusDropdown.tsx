// ============================================================
// STATUS DROPDOWN COMPONENT
// Colored status badge with dropdown selector
// ============================================================

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CATALYST_COLORS } from '../../types/kanban';

interface StatusDropdownProps {
  currentStatusId: string;
  currentStatus: any;
  onChange: (statusId: string) => void;
}

function useStatuses() {
  return useQuery({
    queryKey: ['planner-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_statuses')
        .select('*')
        .order('position');
      if (error) throw error;
      return data;
    },
  });
}

export function StatusDropdown({ currentStatusId, currentStatus, onChange }: StatusDropdownProps) {
  const { data: statuses = [] } = useStatuses();
  const [open, setOpen] = useState(false);

  const getStatusColor = (slug: string) => {
    const colors: Record<string, string> = {
      backlog: CATALYST_COLORS.gray400,
      planned: CATALYST_COLORS.gray500,
      'in-progress': CATALYST_COLORS.gray600,
      review: CATALYST_COLORS.gray700,
      done: CATALYST_COLORS.gray700,
    };
    return colors[slug] || CATALYST_COLORS.gray500;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors hover:opacity-80"
          style={{
            backgroundColor: `${getStatusColor(currentStatus?.slug)}15`,
            color: getStatusColor(currentStatus?.slug),
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: getStatusColor(currentStatus?.slug) }}
          />
          {currentStatus?.name || 'Select status'}
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {statuses.map((status) => (
          <DropdownMenuItem
            key={status.id}
            onClick={() => {
              onChange(status.id);
              setOpen(false);
            }}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(status.slug) }}
              />
              {status.name}
            </span>
            {status.id === currentStatusId && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
