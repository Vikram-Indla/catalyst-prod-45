import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

interface ProjectMapping {
  id?: string;
  jira_project_key: string;
  jira_project_name: string;
  jira_project_id: string;
  catalyst_program_id: string;
  sync_enabled: boolean;
}

export function ProjectMappingDialog({ open, onOpenChange, connectionId }: ProjectMappingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mappings, setMappings] = useState<ProjectMapping[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [fetchingProjects, setFetchingProjects] = useState(false);

  useEffect(() => {
    if (open && connectionId) {
      loadMappings();
      loadPrograms();
    }
  }, [open, connectionId]);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jira_project_mappings")
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

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setPrograms(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchJiraProjects = async () => {
    setFetchingProjects(true);
    try {
      const { data, error } = await supabase.functions.invoke("jira-fetch-projects", {
        body: { connectionId },
      });

      if (error) throw error;

      if (data.projects) {
        const newMappings = data.projects.map((project: any) => ({
          jira_project_key: project.key,
          jira_project_name: project.name,
          jira_project_id: project.id,
          catalyst_program_id: "",
          sync_enabled: false,
        }));
        setMappings(newMappings);
        toast.success(`Fetched ${data.projects.length} Jira projects`);
      }
    } catch (error: any) {
      toast.error(`Failed to fetch projects: ${error.message}`);
    } finally {
      setFetchingProjects(false);
    }
  };

  const addMapping = () => {
    setMappings([
      ...mappings,
      {
        jira_project_key: "",
        jira_project_name: "",
        jira_project_id: "",
        catalyst_program_id: "",
        sync_enabled: true,
      },
    ]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: keyof ProjectMapping, value: any) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete existing mappings
      await supabase
        .from("jira_project_mappings")
        .delete()
        .eq("connection_id", connectionId);

      // Insert new mappings
      const { error } = await supabase.from("jira_project_mappings").insert(
        mappings
          .filter((m) => m.jira_project_key && m.catalyst_program_id && m.jira_project_id)
          .map((m) => ({
            connection_id: connectionId,
            jira_project_key: m.jira_project_key,
            jira_project_name: m.jira_project_name,
            jira_project_id: m.jira_project_id,
            catalyst_program_id: m.catalyst_program_id,
            sync_enabled: m.sync_enabled,
          }))
      );

      if (error) throw error;
      toast.success("Project mappings saved");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Project Mappings</DialogTitle>
          <DialogDescription>
            Map Jira projects to Catalyst programs for synchronization
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={fetchJiraProjects}
            disabled={fetchingProjects}
          >
            {fetchingProjects && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <RefreshCw className="w-4 h-4 mr-2" />
            Fetch from Jira
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {mappings.map((mapping, index) => (
              <div key={index} className="grid grid-cols-4 gap-3 p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Jira Project Key</Label>
                  <Input
                    value={mapping.jira_project_key}
                    onChange={(e) => updateMapping(index, "jira_project_key", e.target.value)}
                    placeholder="PROJ"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Jira Project Name</Label>
                  <Input
                    value={mapping.jira_project_name}
                    onChange={(e) => updateMapping(index, "jira_project_name", e.target.value)}
                    placeholder="Project Name"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Catalyst Program</Label>
                  <Select
                    value={mapping.catalyst_program_id}
                    onValueChange={(value) => updateMapping(index, "catalyst_program_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant={mapping.sync_enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateMapping(index, "sync_enabled", !mapping.sync_enabled)}
                    className={mapping.sync_enabled ? "bg-brand-gold hover:bg-brand-gold-hover" : ""}
                  >
                    {mapping.sync_enabled ? "Enabled" : "Disabled"}
                  </Button>
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
