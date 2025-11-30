import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

interface FieldMapping {
  id?: string;
  catalyst_entity: string;
  catalyst_field: string;
  jira_field: string;
  jira_field_type: string;
  sync_direction: string;
}

export function FieldMappingDialog({ open, onOpenChange, connectionId }: FieldMappingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  useEffect(() => {
    if (open && connectionId) {
      loadMappings();
    }
  }, [open, connectionId]);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jira_field_mappings")
        .select("*")
        .eq("connection_id", connectionId);

      if (error) throw error;
      setMappings(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addMapping = () => {
    setMappings([
      ...mappings,
      {
        catalyst_entity: "story",
        catalyst_field: "name",
        jira_field: "summary",
        jira_field_type: "string",
        sync_direction: "bidirectional",
      },
    ]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: keyof FieldMapping, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete existing mappings
      await supabase
        .from("jira_field_mappings")
        .delete()
        .eq("connection_id", connectionId);

      // Insert new mappings
      const { error } = await supabase.from("jira_field_mappings").insert(
        mappings.map((m) => ({
          ...m,
          connection_id: connectionId,
        }))
      );

      if (error) throw error;
      toast.success("Field mappings saved");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const catalystEntities = ["story", "feature", "epic", "capability", "theme"];
  const syncDirections = ["bidirectional", "catalyst_to_jira", "jira_to_catalyst"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Field Mappings</DialogTitle>
          <DialogDescription>
            Map Catalyst fields to Jira fields for synchronization
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {mappings.map((mapping, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Catalyst Entity</Label>
                  <Select
                    value={mapping.catalyst_entity}
                    onValueChange={(value) => updateMapping(index, "catalyst_entity", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {catalystEntities.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {entity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Catalyst Field</Label>
                  <Input
                    value={mapping.catalyst_field}
                    onChange={(e) => updateMapping(index, "catalyst_field", e.target.value)}
                    placeholder="name"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Jira Field</Label>
                  <Input
                    value={mapping.jira_field}
                    onChange={(e) => updateMapping(index, "jira_field", e.target.value)}
                    placeholder="summary"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Sync Direction</Label>
                  <Select
                    value={mapping.sync_direction}
                    onValueChange={(value) => updateMapping(index, "sync_direction", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {syncDirections.map((dir) => (
                        <SelectItem key={dir} value={dir}>
                          {dir.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMapping(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addMapping} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-brand-gold hover:bg-brand-gold-hover">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Mappings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
