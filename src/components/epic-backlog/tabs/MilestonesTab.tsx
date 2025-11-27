import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle2, Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface MilestonesTabProps {
  epicId: string;
}

export function MilestonesTab({ epicId }: MilestonesTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["epic-milestones", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("epic_id", epicId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Milestones</h3>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {!milestones || milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No milestones defined. Add milestones to track key deliverables.
        </p>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-start gap-3 p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="mt-0.5">
                {milestone.state === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{milestone.title}</div>
                {milestone.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {milestone.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Due: {format(new Date(milestone.due_date), "MMM d, yyyy")}</span>
                  </div>
                  {milestone.completed_date && (
                    <span className="text-green-600">
                      Completed: {format(new Date(milestone.completed_date), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TODO: Implement AddMilestoneModal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Milestone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              TODO: Implement milestone creation form
            </p>
            <Button onClick={() => setShowAddModal(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
