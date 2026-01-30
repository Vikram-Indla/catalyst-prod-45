/**
 * Styled Workstream Select - TaskBoardModal Style
 * Uses Radix Select with position="popper" for proper anchoring
 */

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserRole } from '@/hooks/useUserRole';

// Colors from TaskBoardModal
const COLORS = {
  textPrimary: '#0f172a',
  textLight: '#94a3b8',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  accentLight: '#dbeafe'
};

interface Workstream {
  id: string;
  name: string;
  color: string;
}

interface StyledWorkstreamSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function StyledWorkstreamSelect({ value, onChange, error }: StyledWorkstreamSelectProps) {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  
  const canAccessAll = isAdmin || isSuperAdmin;

  // Fetch accessible workstreams based on user role
  const { data: workstreams = [], isLoading } = useQuery({
    queryKey: ['planner-workstreams-select', user?.id, canAccessAll],
    queryFn: async () => {
      if (!user) return [];

      if (canAccessAll) {
        const { data, error } = await supabase
          .from('planner_workstreams')
          .select('id, name, color')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        return data as Workstream[];
      }

      const { data: memberships, error: memberError } = await supabase
        .from('workstream_members')
        .select(`
          workstream_id,
          workstream:planner_workstreams(id, name, color, is_active)
        `)
        .eq('user_id', user.id);
      
      if (memberError) throw memberError;

      return (memberships || [])
        .filter(m => (m.workstream as any)?.is_active)
        .map(m => m.workstream as Workstream);
    },
    enabled: !!user && !roleLoading,
    staleTime: 5 * 60 * 1000,
  });

  const selected = workstreams.find(w => w.id === value);

  return (
    <div className="flex flex-col gap-1.5">
      {/* LABEL */}
      <span 
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: COLORS.textLight }}
      >
        Workstream <span className="text-red-500">*</span>
      </span>

      {/* RADIX SELECT */}
      <SelectPrimitive.Root 
        value={value} 
        onValueChange={onChange}
        disabled={isLoading}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "flex items-center gap-2.5 px-3.5 py-2.5 w-full",
            "bg-white border rounded-[10px] cursor-pointer",
            "transition-all duration-150 outline-none",
            "hover:border-slate-300",
            "focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15",
            "data-[state=open]:border-blue-500 data-[state=open]:ring-[3px] data-[state=open]:ring-blue-500/15",
            "disabled:opacity-50 disabled:cursor-wait",
            error && "border-red-500"
          )}
          style={{ borderColor: error ? '#ef4444' : COLORS.borderLight }}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin text-slate-400" />
              <span className="flex-1 text-sm text-slate-400 text-left">Loading...</span>
            </>
          ) : selected ? (
            <>
              {/* Color dot */}
              <span 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: selected.color }}
              />
              <SelectPrimitive.Value>
                <span className="flex-1 text-sm font-medium text-slate-900">
                  {selected.name}
                </span>
              </SelectPrimitive.Value>
            </>
          ) : (
            <SelectPrimitive.Value>
              <span className="flex-1 text-sm text-slate-400 text-left">
                Select workstream...
              </span>
            </SelectPrimitive.Value>
          )}
          
          {/* Icon */}
          <SelectPrimitive.Icon asChild>
            <ChevronDown 
              size={16} 
              className="text-slate-400 transition-transform duration-200 ml-auto" 
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        {/* Error message */}
        {error && (
          <span className="text-xs text-red-500 font-medium mt-1">{error}</span>
        )}

        {/* PORTAL + CONTENT with position="popper" */}
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            side="bottom"
            align="start"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={{ top: 8, right: 8, bottom: 68, left: 8 }}
            className={cn(
              "bg-white border rounded-xl shadow-xl overflow-hidden",
              "min-w-[var(--radix-select-trigger-width)]",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
            style={{ 
              borderColor: COLORS.borderDefault,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
              zIndex: 'var(--z-modal-popover, 500)'
            }}
          >
            <SelectPrimitive.Viewport className="p-1.5 max-h-[280px] overflow-y-auto">
              {workstreams.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-slate-400">
                  No workstreams available
                </div>
              ) : (
                workstreams.map((ws) => (
                  <SelectPrimitive.Item
                    key={ws.id}
                    value={ws.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer outline-none",
                      "transition-colors duration-100",
                      "data-[highlighted]:bg-slate-100",
                      "data-[state=checked]:bg-blue-50"
                    )}
                  >
                    {/* Color dot */}
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: ws.color }}
                    />
                    
                    {/* Label */}
                    <SelectPrimitive.ItemText>
                      <span className="flex-1 text-sm text-slate-900">{ws.name}</span>
                    </SelectPrimitive.ItemText>
                    
                    {/* Check */}
                    <SelectPrimitive.ItemIndicator>
                      <Check size={16} className="text-blue-600" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
