import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Briefcase, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AddChildObjectiveDialogProps {
  open: boolean;
  onClose: () => void;
  parentObjectiveId: string;
}

// Status badge variant helper
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'completed': return 'default';
    case 'on_track': return 'secondary';
    case 'at_risk': 
    case 'off_track': return 'destructive';
    default: return 'outline';
  }
};

// Format status for display
const formatStatus = (status: string) => {
  return (status || 'pending').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function AddChildObjectiveDialog({
  open,
  onClose,
  parentObjectiveId,
}: AddChildObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Fetch available objectives with portfolio/program context
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ["available-objectives", search, parentObjectiveId],
    queryFn: async () => {
      // Fetch objectives
      let query = supabase
        .from("objectives")
        .select("id, name, tier, status, score, portfolio_id, program_id")
        .neq("id", parentObjectiveId)
        .is("parent_objective_id", null)
        .in("tier", ["portfolio", "program"])
        .limit(20);

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data: objectivesData, error } = await query;
      if (error) throw error;

      // Get unique portfolio/program IDs
      const portfolioIds = [...new Set(objectivesData?.map(o => o.portfolio_id).filter(Boolean))];
      const programIds = [...new Set(objectivesData?.map(o => o.program_id).filter(Boolean))];

      // Fetch portfolio names (now 'programs' table)
      let portfoliosMap: Record<string, string> = {};
      if (portfolioIds.length > 0) {
        const { data: portfolios } = await supabase
          .from("programs")
          .select("id, name")
          .in("id", portfolioIds);
        portfoliosMap = Object.fromEntries(portfolios?.map(p => [p.id, p.name]) || []);
      }

      // Fetch program names (now 'projects' table)
      let programsMap: Record<string, string> = {};
      if (programIds.length > 0) {
        const { data: programs } = await supabase
          .from("projects")
          .select("id, name")
          .in("id", programIds);
        programsMap = Object.fromEntries(programs?.map(p => [p.id, p.name]) || []);
      }

      // Enrich objectives with context names
      return (objectivesData || []).map(obj => ({
        ...obj,
        summary: obj.name,
        portfolioName: obj.portfolio_id ? portfoliosMap[obj.portfolio_id] : null,
        programName: obj.program_id ? programsMap[obj.program_id] : null,
      }));
    },
    enabled: open,
  });

  // Link child mutation
  const linkChildMutation = useMutation({
    mutationFn: async (childId: string) => {
      const { error } = await supabase
        .from("objectives")
        .update({ parent_objective_id: parentObjectiveId })
        .eq("id", childId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-objectives", parentObjectiveId] });
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      toast.success("Child objective added");
      onClose();
    },
    onError: () => {
      toast.error("Failed to add child objective");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Child Objective</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search objectives..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : objectives.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No available objectives found</div>
            ) : (
              objectives.map((obj: any) => (
                <div
                  key={obj.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Primary line: Objective summary */}
                    <div className="font-medium truncate pr-2">
                      {obj.summary || obj.name || 'Untitled Objective'}
                    </div>
                    
                    {/* Secondary line: Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Tier badge */}
                      <Badge variant="outline" className="text-xs capitalize">
                        {obj.tier}
                      </Badge>
                      
                      {/* Status badge */}
                      <Badge variant={getStatusBadgeVariant(obj.status)} className="text-xs">
                        {formatStatus(obj.status)}
                      </Badge>
                      
                      {/* Context badge - Portfolio or Program */}
                      {obj.tier === 'portfolio' && obj.portfolioName && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {obj.portfolioName}
                        </Badge>
                      )}
                      {obj.tier === 'program' && obj.programName && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {obj.programName}
                        </Badge>
                      )}
                      
                      {/* ID (subtle) */}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {obj.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => linkChildMutation.mutate(obj.id)}
                    disabled={linkChildMutation.isPending}
                  >
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
