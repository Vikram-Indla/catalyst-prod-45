import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface ForecastTabProps {
  workItemId: string;
  workItemType: 'epic' | 'feature';
}

export function ForecastTab({ workItemId, workItemType }: ForecastTabProps) {
  const [selectedPiId, setSelectedPiId] = useState<string>('');
  const [sumAll, setSumAll] = useState(false);

  // Fetch program increments
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch forecast entries
  const { data: forecasts, refetch } = useQuery({
    queryKey: ['forecasts', workItemId, workItemType, selectedPiId],
    queryFn: async () => {
      let query = supabase
        .from('forecast_entries')
        .select(`
          *,
          program_increments(name),
          programs(name),
          teams(name)
        `)
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType);

      if (selectedPiId && !sumAll) {
        query = query.eq('pi_id', selectedPiId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPiId || sumAll
  });

  // Fetch programs and teams for dropdowns
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const handleEstimateChange = async (forecastId: string, newEstimate: number) => {
    const { error } = await supabase
      .from('forecast_entries')
      .update({ estimate: newEstimate })
      .eq('id', forecastId);

    if (error) {
      toast.error('Failed to update estimate');
      return;
    }

    toast.success('Estimate updated');
    refetch();
  };

  const handleAddForecast = async (programId: string, teamId: string) => {
    if (!selectedPiId) {
      toast.error('Please select a Program Increment');
      return;
    }

    const { error } = await supabase
      .from('forecast_entries')
      .insert({
        work_item_id: workItemId,
        work_item_type: workItemType,
        pi_id: selectedPiId,
        program_id: programId || null,
        team_id: teamId || null,
        estimate: 0,
        unit: 'points'
      });

    if (error) {
      toast.error('Failed to add forecast');
      return;
    }

    toast.success('Forecast added');
    refetch();
  };

  const totalEstimate = forecasts?.reduce((sum, f) => sum + (f.estimate || 0), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Program Increment:</span>
          <Select value={selectedPiId} onValueChange={setSelectedPiId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select PI" />
            </SelectTrigger>
            <SelectContent>
              {programIncrements?.map((pi) => (
                <SelectItem key={pi.id} value={pi.id}>
                  {pi.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={sumAll ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSumAll(!sumAll)}
        >
          Sum All
        </Button>

        <div className="ml-auto">
          <span className="text-sm font-medium">Total: </span>
          <span className="text-lg font-bold text-brand-gold">{totalEstimate}</span>
        </div>
      </div>

      {/* Forecast Grid */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program Increment</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="w-32">Estimate</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forecasts && forecasts.length > 0 ? (
              forecasts.map((forecast) => (
                <TableRow key={forecast.id}>
                  <TableCell>{forecast.program_increments?.name}</TableCell>
                  <TableCell>{forecast.programs?.name || '-'}</TableCell>
                  <TableCell>{forecast.teams?.name || '-'}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={forecast.estimate}
                      onChange={(e) => handleEstimateChange(forecast.id, parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>{forecast.unit}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {selectedPiId ? 'No forecasts found. Click + to add one.' : 'Select a Program Increment to view forecasts'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Forecast Button */}
      {selectedPiId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddForecast('', '')}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Forecast Entry
        </Button>
      )}
    </div>
  );
}
