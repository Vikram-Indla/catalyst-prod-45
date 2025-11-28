import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface EpicForecastTabProps {
  epic: any;
}

export function EpicForecastTab({ epic }: EpicForecastTabProps) {
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date');
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Forecast effort estimates across Program Increments
        </div>
        <Button size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save Forecast
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program Increment</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Estimate</TableHead>
              <TableHead>In Scope</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programIncrements && programIncrements.length > 0 ? (
              programIncrements.map((pi) => (
                <TableRow key={pi.id}>
                  <TableCell className="font-medium">{pi.name}</TableCell>
                  <TableCell>All Programs</TableCell>
                  <TableCell>All Teams</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="w-24 text-right"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <input type="checkbox" defaultChecked />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No program increments available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground">
        Estimates autosave on blur. Use "In Scope" to indicate PI commitment.
      </div>
    </div>
  );
}
