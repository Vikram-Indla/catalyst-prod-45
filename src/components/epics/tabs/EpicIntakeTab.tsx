import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EpicIntakeTabProps {
  epicId: string;
}

export function EpicIntakeTab({ epicId }: EpicIntakeTabProps) {
  const { data: intakeFields } = useQuery({
    queryKey: ["intake-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_fields")
        .select("*")
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const { data: responses, refetch } = useQuery({
    queryKey: ["epic-intake-responses", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epic_intake_responses")
        .select("*")
        .eq("epic_id", epicId);
      if (error) throw error;
      return data;
    },
  });

  const getResponse = (fieldId: string) => {
    return responses?.find((r) => r.field_id === fieldId)?.value || "";
  };

  const handleUpdate = async (fieldId: string, value: string) => {
    const existing = responses?.find((r) => r.field_id === fieldId);

    if (existing) {
      const { error } = await supabase
        .from("epic_intake_responses")
        .update({ value })
        .eq("id", existing.id);

      if (error) {
        toast.error("Failed to update response");
      }
    } else {
      const { error } = await supabase
        .from("epic_intake_responses")
        .insert({ epic_id: epicId, field_id: fieldId, value });

      if (error) {
        toast.error("Failed to add response");
      }
    }
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Intake Form</h3>
        <p className="text-sm text-muted-foreground">
          Capture additional information during epic intake
        </p>
      </div>

      {intakeFields && intakeFields.length > 0 ? (
        <div className="space-y-4">
          {intakeFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>{field.field_name}</Label>
              {field.field_type === "text" && (
                <Textarea
                  id={field.id}
                  defaultValue={getResponse(field.id)}
                  onBlur={(e) => handleUpdate(field.id, e.target.value)}
                  placeholder={`Enter ${field.field_name.toLowerCase()}...`}
                />
              )}
              {field.field_type === "number" && (
                <Input
                  id={field.id}
                  type="number"
                  defaultValue={getResponse(field.id)}
                  onBlur={(e) => handleUpdate(field.id, e.target.value)}
                />
              )}
              {field.field_type === "select" && field.options && (
                <Select
                  value={getResponse(field.id)}
                  onValueChange={(value) => handleUpdate(field.id, value)}
                >
                  <SelectTrigger id={field.id}>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No intake fields configured. Configure intake fields in Admin settings.
        </div>
      )}
    </div>
  );
}
