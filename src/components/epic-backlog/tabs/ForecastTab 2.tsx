import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

interface ForecastTabProps {
  epicId: string;
}

export function ForecastTab({ epicId }: ForecastTabProps) {
  const { data: programIncrements, isLoading: loadingPIs } = useQuery({
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

  const { data: forecastEntries, isLoading: loadingForecasts } = useQuery({
    queryKey: ["epic-forecast", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forecast_entries")
        .select("*")
        .eq("work_item_id", epicId)
        .eq("work_item_type", "epic");

      if (error) throw error;
      return data;
    },
  });

  if (loadingPIs || loadingForecasts) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const getForecastForPI = (piId: string) => {
    return forecastEntries?.find((f) => f.pi_id === piId)?.estimate || 0;
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-3">PI-by-PI Forecast</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Estimate effort (story points) required for this epic across program increments
        </p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-4 pb-2 border-b text-xs font-medium text-muted-foreground">
          <div>Program Increment</div>
          <div>Estimate (Points)</div>
          <div>Status</div>
        </div>

        {programIncrements && programIncrements.length > 0 ? (
          programIncrements.map((pi) => (
            <div key={pi.id} className="grid grid-cols-3 gap-4 items-center py-2">
              <div className="text-sm font-medium">{pi.name}</div>
              <div>
                <Input
                  type="number"
                  min="0"
                  value={getForecastForPI(pi.id)}
                  placeholder="0"
                  className="h-8 w-24"
                  // TODO: Implement autosave on blur
                />
              </div>
              <div>
                <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                  {pi.state || "Planning"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No program increments available
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between p-3 bg-accent rounded-md">
          <span className="text-sm font-semibold">Total Forecast</span>
          <span className="text-lg font-bold">
            {forecastEntries?.reduce((sum, f) => sum + (f.estimate || 0), 0) || 0} points
          </span>
        </div>
      </div>
    </div>
  );
}
