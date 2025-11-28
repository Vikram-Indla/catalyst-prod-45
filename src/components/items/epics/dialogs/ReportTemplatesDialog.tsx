import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Trash2, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface ReportTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: "status" | "trace" | "hierarchy";
}

export function ReportTemplatesDialog({
  open,
  onOpenChange,
  reportType,
}: ReportTemplatesDialogProps) {
  const queryClient = useQueryClient();
  const [templateName, setTemplateName] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleCron, setScheduleCron] = useState("0 9 * * 1");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["epic-report-templates", reportType],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("epic_report_templates")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_type", reportType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("epic_report_templates").insert({
        user_id: user.id,
        name: templateName,
        report_type: reportType,
        is_scheduled: isScheduled,
        schedule_cron: isScheduled ? scheduleCron : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epic-report-templates"] });
      toast.success("Template saved successfully");
      setTemplateName("");
      setIsScheduled(false);
    },
    onError: (error) => {
      console.error("Save template error:", error);
      toast.error("Failed to save template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("epic_report_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epic-report-templates"] });
      toast.success("Template deleted");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const getScheduleLabel = (cron: string) => {
    const schedules: Record<string, string> = {
      "0 9 * * 1": "Weekly (Monday 9 AM)",
      "0 9 1 * *": "Monthly (1st, 9 AM)",
      "0 9 * * *": "Daily (9 AM)",
    };
    return schedules[cron] || cron;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Templates
          </DialogTitle>
          <DialogDescription>
            Save and manage report configurations for quick reuse and scheduling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Template */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-medium text-sm">Create New Template</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Weekly Status Report"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="scheduled"
                  checked={isScheduled}
                  onCheckedChange={(checked) =>
                    setIsScheduled(checked as boolean)
                  }
                />
                <Label htmlFor="scheduled" className="font-normal cursor-pointer">
                  Enable scheduled generation
                </Label>
              </div>

              {isScheduled && (
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select value={scheduleCron} onValueChange={setScheduleCron}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 9 * * 1">
                        Weekly (Monday 9 AM)
                      </SelectItem>
                      <SelectItem value="0 9 1 * *">
                        Monthly (1st day, 9 AM)
                      </SelectItem>
                      <SelectItem value="0 9 * * *">Daily (9 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!templateName || saveMutation.isPending}
                className="w-full"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Saved Templates */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Saved Templates</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No templates saved yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{template.name}</p>
                      {template.is_scheduled && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            Scheduled
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getScheduleLabel(template.schedule_cron || "")}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(template.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
