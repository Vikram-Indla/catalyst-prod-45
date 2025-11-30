import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface StatusMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

const CATALYST_STATUSES = [
  "funnel", "analyzing", "backlog", "implementing", 
  "validating", "deploying", "done", "blocked"
];

export function StatusMappingDialog({ open, onOpenChange, connectionId }: StatusMappingDialogProps) {
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<Array<{ catalyst: string; jira: string }>>([]);
  const [jiraStatuses, setJiraStatuses] = useState<string[]>([]);

  const { isLoading: loadingStatuses } = useQuery({
    queryKey: ["jira-statuses", connectionId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("jira-fetch-statuses", {
        body: { connectionId },
      });
      if (error) throw error;
      setJiraStatuses(data.statuses || []);
      return data;
    },
    enabled: open,
  });

  const { data: existingMappings, isLoading: loadingMappings } = useQuery({
    queryKey: ["status-mappings", connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jira_connections")
        .select("sync_settings")
        .eq("id", connectionId)
        .single();
      
      if (error) throw error;
      const settings = data.sync_settings as any;
      const existing = settings?.statusMappings || [];
      setMappings(existing);
      return existing;
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: connection } = await supabase
        .from("jira_connections")
        .select("sync_settings")
        .eq("id", connectionId)
        .single();

      const currentSettings = (connection?.sync_settings as any) || {};
      
      const { error } = await supabase
        .from("jira_connections")
        .update({
          sync_settings: {
            ...currentSettings,
            statusMappings: mappings,
          },
        })
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status mappings saved");
      queryClient.invalidateQueries({ queryKey: ["status-mappings"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const addMapping = () => {
    setMappings([...mappings, { catalyst: "", jira: "" }]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: "catalyst" | "jira", value: string) => {
    const updated = [...mappings];
    updated[index][field] = value;
    setMappings(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Status Mapping Configuration</DialogTitle>
          <DialogDescription>
            Map Catalyst work item statuses to Jira issue statuses for bidirectional sync
          </DialogDescription>
        </DialogHeader>

        {(loadingStatuses || loadingMappings) ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Status Mappings</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addMapping}
                className="border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Mapping
              </Button>
            </div>

            <div className="space-y-3">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>Catalyst Status</Label>
                    <Select
                      value={mapping.catalyst}
                      onValueChange={(value) => updateMapping(index, "catalyst", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATALYST_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Label>Jira Status</Label>
                    <Select
                      value={mapping.jira}
                      onValueChange={(value) => updateMapping(index, "jira", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {jiraStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMapping(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {mappings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No status mappings configured. Click "Add Mapping" to create one.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="bg-brand-gold hover:bg-brand-gold-hover text-white"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Mappings
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
