/**
 * RiskLinkDialog - Step 2B: Select an existing risk to link to a feature
 */

import { useState } from 'react';
import { Search, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RiskLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureId: string;
  programId?: string | null;
  onSuccess?: () => void;
}

interface Risk {
  id: string;
  title: string;
  risk_number: number;
  status: string | null;
  program_id: string | null;
}

export function RiskLinkDialog({
  open,
  onOpenChange,
  featureId,
  programId,
  onSuccess,
}: RiskLinkDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch existing linked risk IDs to filter out
  const { data: existingLinks = [] } = useQuery({
    queryKey: ['feature-risk-links', featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_links')
        .select('to_work_item_id')
        .eq('from_work_item_id', featureId)
        .eq('from_work_item_type', 'feature')
        .eq('to_work_item_type', 'risk');
      
      if (error) throw error;
      return data?.map((l) => l.to_work_item_id) || [];
    },
    enabled: open && !!featureId,
  });

  // Fetch risks (optionally scoped by program)
  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['risks-for-linking', programId, search],
    queryFn: async () => {
      let query = supabase
        .from('risks')
        .select('id, title, risk_number, status, program_id')
        .is('deleted_at', null)
        .order('risk_number', { ascending: true });
      
      // Scope to program if available
      if (programId) {
        query = query.or(`program_id.eq.${programId},program_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Risk[]) || [];
    },
    enabled: open,
  });

  // Filter by search and exclude already linked
  const filteredRisks = risks.filter((r) => {
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      `RSK-${r.risk_number}`.toLowerCase().includes(search.toLowerCase());
    const notLinked = !existingLinks.includes(r.id);
    return matchesSearch && notLinked;
  });

  // Mutation to create link
  const linkRisk = useMutation({
    mutationFn: async (riskId: string) => {
      const { error } = await supabase.from('work_item_links').insert({
        from_work_item_id: featureId,
        from_work_item_type: 'feature',
        to_work_item_id: riskId,
        to_work_item_type: 'risk',
        link_type: 'relates_to',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-linked-items', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-risk-links', featureId] });
      toast.success('Risk linked');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to link risk');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Link Risk</DialogTitle>
          <DialogDescription>Select an existing risk to link to this feature</DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search risks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="mt-3 max-h-[280px] overflow-y-auto border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={16} />
              Loading risks...
            </div>
          ) : filteredRisks.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {search ? 'No risks match your search' : 'No risks available to link'}
            </div>
          ) : (
            filteredRisks.map((risk) => (
              <button
                key={risk.id}
                type="button"
                className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left border-b last:border-b-0"
                onClick={() => linkRisk.mutate(risk.id)}
                disabled={linkRisk.isPending}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded bg-destructive/10 text-destructive shrink-0">
                  <AlertTriangle size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      RSK-{risk.risk_number}
                    </span>
                    {risk.status && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {risk.status}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-foreground truncate">{risk.title}</div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
