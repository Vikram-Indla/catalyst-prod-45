import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ObjectiveForm, type ObjectiveFormValues } from "./ObjectiveForm";
import { useCreateObjective } from "@/hooks/useObjectives";
import { toast } from "sonner";
import type { ObjectiveTier } from "../../types/objective.types";

interface CreateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier?: ObjectiveTier;
  portfolioId?: string;
  programId?: string;
  teamId?: string;
}

export function CreateObjectiveDialog({ 
  open, 
  onOpenChange, 
  tier = "portfolio",
  portfolioId,
  programId,
  teamId 
}: CreateObjectiveDialogProps) {
  const createObjective = useCreateObjective();

  const handleSubmit = async (values: ObjectiveFormValues) => {
    try {
      await createObjective.mutateAsync({
        ...values,
        tier,
        portfolio_id: portfolioId,
        program_id: programId,
        team_id: teamId,
        tags: [],
        program_increment_ids: [],
        contributors: [],
        work_progress: 0,
        key_result_progress: 0,
      });
      onOpenChange(false);
      toast.success("Objective created successfully");
    } catch (error) {
      console.error("Failed to create objective:", error);
      toast.error("Failed to create objective");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Objective</DialogTitle>
        </DialogHeader>
        <ObjectiveForm
          tier={tier}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createObjective.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
