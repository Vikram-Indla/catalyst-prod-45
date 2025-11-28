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
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AddChildObjectiveDialogProps {
  open: boolean;
  onClose: () => void;
  parentObjectiveId: string;
}

export function AddChildObjectiveDialog({
  open,
  onClose,
  parentObjectiveId,
}: AddChildObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Fetch available objectives
  const { data: objectives = [] } = useQuery({
    queryKey: ["available-objectives", search, parentObjectiveId],
    queryFn: async () => {
      let query = supabase
        .from("objectives")
        .select("id, summary, tier, status, score")
        .neq("id", parentObjectiveId)
        .is("parent_objective_id", null)
        .limit(20);

      if (search) {
        query = query.ilike("summary", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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
            {objectives.map((obj: any) => (
              <div
                key={obj.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
              >
                <div className="flex-1">
                  <div className="font-medium">{obj.summary}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {obj.id.slice(0, 8)}
                    </Badge>
                    <Badge variant="outline">{obj.tier}</Badge>
                    <Badge variant="outline">
                      {obj.status?.replace("_", " ").toUpperCase() || "PENDING"}
                    </Badge>
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
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
