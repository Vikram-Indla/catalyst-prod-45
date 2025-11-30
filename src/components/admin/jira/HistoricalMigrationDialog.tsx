import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Database } from "lucide-react";

interface HistoricalMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

const WORK_ITEM_TYPES = [
  { id: "theme", label: "Themes" },
  { id: "epic", label: "Epics" },
  { id: "capability", label: "Capabilities" },
  { id: "feature", label: "Features" },
  { id: "story", label: "Stories" },
  { id: "defect", label: "Defects" },
  { id: "task", label: "Tasks" },
];

export function HistoricalMigrationDialog({
  open,
  onOpenChange,
  connectionId,
}: HistoricalMigrationDialogProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["story"]);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const migrationMutation = useMutation({
    mutationFn: async () => {
      setIsRunning(true);
      setProgress(0);

      const { data, error } = await supabase.functions.invoke("jira-historical-migration", {
        body: {
          connectionId,
          workItemTypes: selectedTypes,
          onProgress: (current: number, total: number, item: string) => {
            setProgress((current / total) * 100);
            setCurrentItem(item);
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsRunning(false);
      toast.success(
        `Migration complete: ${data.migrated} items synced, ${data.errors?.length || 0} errors`
      );
      if (data.errors?.length > 0) {
        console.error("Migration errors:", data.errors);
        toast.error(`${data.errors.length} items failed to migrate`);
      }
    },
    onError: (error: any) => {
      setIsRunning(false);
      toast.error(`Migration failed: ${error.message}`);
    },
  });

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const startMigration = () => {
    if (selectedTypes.length === 0) {
      toast.error("Select at least one work item type");
      return;
    }
    migrationMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Historical Data Migration</DialogTitle>
          <DialogDescription>
            Import existing work items from Jira to Catalyst. This is a one-time bulk import operation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select Work Item Types to Import</Label>
            <div className="space-y-2 mt-2">
              {WORK_ITEM_TYPES.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.id}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={() => toggleType(type.id)}
                    disabled={isRunning}
                  />
                  <Label htmlFor={type.id} className="cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Migrating...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">{currentItem}</p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Database className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> This will create new records in Catalyst for all matched Jira issues.
                Existing work items will not be affected.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRunning}
            >
              Cancel
            </Button>
            <Button
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={startMigration}
              disabled={isRunning || selectedTypes.length === 0}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                "Start Migration"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
