import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ObjectiveForm, type ObjectiveFormValues } from "./ObjectiveForm";
import { useCreateObjective } from "@/hooks/useObjectives";
import type { ObjectiveTier } from "../../types/objective.types";

interface CreateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier?: ObjectiveTier;
  portfolioId?: string;
  programId?: string;
}

export function CreateObjectiveDialog({ 
  open, 
  onOpenChange, 
  tier = "portfolio",
  portfolioId,
  programId,
}: CreateObjectiveDialogProps) {
  const createObjective = useCreateObjective();

  const handleSubmit = async (values: ObjectiveFormValues) => {
    try {
      await createObjective.mutateAsync({
        ...values,
        tier: values.tier, // Use the tier from form, not prop override
        // Use form values first, fallback to props if form value is empty
        portfolio_id: values.portfolio_id || portfolioId,
        program_id: values.program_id || programId,
        tags: [],
        program_increment_ids: [],
        contributors: [],
        work_progress: 0,
        key_result_progress: 0,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create objective:", error);
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
