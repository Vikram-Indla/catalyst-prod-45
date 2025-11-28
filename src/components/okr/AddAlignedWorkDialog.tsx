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

interface AddAlignedWorkDialogProps {
  open: boolean;
  onClose: () => void;
  objectiveId: string;
  workType: string;
}

export function AddAlignedWorkDialog({
  open,
  onClose,
  objectiveId,
  workType,
}: AddAlignedWorkDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Fetch available work items
  const { data: items = [] } = useQuery({
    queryKey: [workType === "epic" ? "epics" : "features", search],
    queryFn: async () => {
      if (workType === "epic") {
        const { data, error } = await supabase
          .from("epics")
          .select("id, name, epic_key, state")
          .ilike("name", `%${search}%`)
          .is("deleted_at", null)
          .limit(20);
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase
          .from("features")
          .select("id, name, display_id, status")
          .ilike("name", `%${search}%`)
          .limit(20);
        if (error) throw error;
        return data || [];
      }
    },
    enabled: open,
  });

  // Add link mutation
  const addLinkMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const table = workType === "epic" ? "objective_epic_links" : "objective_feature_links";
      const column = workType === "epic" ? "epic_id" : "feature_id";
      
      const { error } = await supabase.from(table).insert({
        objective_id: objectiveId,
        [column]: itemId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`objective-${workType}s`, objectiveId] });
      toast.success("Work item added");
      onClose();
    },
    onError: () => {
      toast.error("Failed to add work item");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add {workType === "epic" ? "Epic" : "Feature"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
              >
                <div>
                  <div className="font-medium">
                    {workType === "epic" ? item.epic_key : item.display_id} - {item.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {workType === "epic" ? item.state : item.status}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => addLinkMutation.mutate(item.id)}
                  disabled={addLinkMutation.isPending}
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
