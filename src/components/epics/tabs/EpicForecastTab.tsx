import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EpicForecastTabProps {
  epicId: string;
}

export function EpicForecastTab({ epicId }: EpicForecastTabProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const { data: programIncrements } = useQuery({
    queryKey: ["program-increments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_increments")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: forecastEntries, refetch } = useQuery({
    queryKey: ["epic-forecast", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_entries")
        .select("*, program_increments(name)")
        .eq("work_item_id", epicId)
        .eq("work_item_type", "epic");
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleUpdateEstimate = async (
    piId: string,
    programId: string | null,
    teamId: string | null,
    estimate: number
  ) => {
    const existingEntry = forecastEntries?.find(
      (e) => e.pi_id === piId && e.program_id === programId && e.team_id === teamId
    );

    if (existingEntry) {
      const { error } = await supabase
        .from("forecast_entries")
        .update({ estimate, updated_by: (await supabase.auth.getUser()).data.user?.id })
        .eq("id", existingEntry.id);

      if (error) {
        toast.error("Failed to update estimate");
      } else {
        toast.success("Estimate updated");
        refetch();
      }
    } else {
      const { error } = await supabase
        .from("forecast_entries")
        .insert({
          work_item_id: epicId,
          work_item_type: "epic",
          pi_id: piId,
          program_id: programId,
          team_id: teamId,
          estimate,
          unit: "points",
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) {
        toast.error("Failed to add estimate");
      } else {
        toast.success("Estimate added");
        refetch();
      }
    }
    setEditingCell(null);
  };

  const getEstimate = (piId: string, programId: string | null, teamId: string | null) => {
    const entry = forecastEntries?.find(
      (e) => e.pi_id === piId && e.program_id === programId && e.team_id === teamId
    );
    return entry?.estimate || 0;
  };

  const getPITotal = (piId: string) => {
    return forecastEntries
      ?.filter((e) => e.pi_id === piId)
      .reduce((sum, e) => sum + (e.estimate || 0), 0) || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Forecast by Program Increment</h3>
          <p className="text-sm text-muted-foreground">
            Estimate effort across PIs, programs, and teams
          </p>
        </div>
      </div>

      {programIncrements && programIncrements.length > 0 ? (
        <div className="space-y-6">
          {programIncrements.map((pi) => (
            <div key={pi.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{pi.name}</h4>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold">{getPITotal(pi.id)} pts</span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Estimate (pts)</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs?.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">{program.name}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell className="text-right">
                          {editingCell === `${pi.id}-${program.id}-null` ? (
                            <Input
                              type="number"
                              autoFocus
                              defaultValue={getEstimate(pi.id, program.id, null)}
                              onBlur={(e) =>
                                handleUpdateEstimate(
                                  pi.id,
                                  program.id,
                                  null,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleUpdateEstimate(
                                    pi.id,
                                    program.id,
                                    null,
                                    parseFloat(e.currentTarget.value) || 0
                                  );
                                }
                              }}
                              className="w-24 text-right"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingCell(`${pi.id}-${program.id}-null`)}
                              className="w-full text-right hover:bg-accent rounded px-2 py-1"
                            >
                              {getEstimate(pi.id, program.id, null) || "—"}
                            </button>
                          )}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No Program Increments found. Create PIs to enable forecasting.
        </div>
      )}
    </div>
  );
}
