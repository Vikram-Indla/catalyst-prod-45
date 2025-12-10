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
        name: values.name, // Use canonical 'name' field
        description: values.description,
        tier: values.tier,
        status: values.status,
        health: values.health,
        category: values.category,
        type: values.type,
        start_date: values.start_date?.toISOString(),
        due_date: values.due_date?.toISOString(),
        planned_value: values.planned_value,
        delivered_value: values.delivered_value,
        is_blocked: values.is_blocked,
        notes: values.notes,
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
