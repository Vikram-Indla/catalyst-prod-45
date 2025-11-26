import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function ForecastSelfTest() {
  // Check for seed data
  const { data: pis } = useQuery({
    queryKey: ['test-pis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .limit(1);
      return data;
    },
  });

  const { data: capacityPlans } = useQuery({
    queryKey: ['test-capacity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_plans')
        .select('*')
        .limit(1);
      return data;
    },
  });

  const { data: forecastEntries } = useQuery({
    queryKey: ['test-forecasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forecast_entries')
        .select('*')
        .limit(1);
      return data;
    },
  });

  const { data: workItemAssignments } = useQuery({
    queryKey: ['test-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_assignments')
        .select('*')
        .limit(1);
      return data;
    },
  });

  const tests = [
    {
      name: 'Seed data - Program Increments',
      status: pis && pis.length > 0 ? 'pass' : 'fail',
      message: pis && pis.length > 0 ? `${pis.length} PI(s) found` : 'No PIs found',
    },
    {
      name: 'Seed data - Capacity Plans',
      status: capacityPlans && capacityPlans.length > 0 ? 'pass' : 'fail',
      message: capacityPlans && capacityPlans.length > 0 ? `${capacityPlans.length} capacity plan(s) found` : 'No capacity plans found',
    },
    {
      name: 'Seed data - Work Item Assignments',
      status: workItemAssignments && workItemAssignments.length > 0 ? 'pass' : 'fail',
      message: workItemAssignments && workItemAssignments.length > 0 ? `${workItemAssignments.length} assignment(s) found` : 'No assignments found',
    },
    {
      name: 'Seed data - Forecast Entries',
      status: forecastEntries && forecastEntries.length > 0 ? 'pass' : 'fail',
      message: forecastEntries && forecastEntries.length > 0 ? `${forecastEntries.length} forecast entry(ies) found` : 'No forecast entries found',
    },
    {
      name: 'Page rendering - Forecast Grid',
      status: 'pending',
      message: 'Manual test: Navigate to /portfolio/default-portfolio/forecast',
    },
    {
      name: 'Edit + Autosave - Forecast entry',
      status: 'pending',
      message: 'Manual test: Edit a cell and verify autosave toast',
    },
    {
      name: 'Sync - Page to Tab',
      status: 'pending',
      message: 'Manual test: Edit on Forecast page, verify in work item Forecast tab',
    },
    {
      name: 'Ranking - Drag and drop',
      status: 'pending',
      message: 'Manual test: Drag work items to reorder within PI',
    },
    {
      name: 'Ranking - Context menu',
      status: 'pending',
      message: 'Manual test: Right-click work item and use rank actions',
    },
    {
      name: 'Configure Columns - Persistence',
      status: 'pending',
      message: 'Manual test: Toggle columns and verify they persist after refresh',
    },
    {
      name: 'Feature Flag - Weeks Unit',
      status: 'pending',
      message: 'Manual test: Enable forecast_weeks_unit flag and verify unit selector appears',
    },
    {
      name: 'Feature Flag - Export',
      status: 'pending',
      message: 'Manual test: Enable forecast_export flag and verify export button appears',
    },
    {
      name: 'Permission Gating - Edit',
      status: 'pending',
      message: 'Manual test: Login as non-editor role and verify forecast cells are read-only',
    },
    {
      name: 'Over-Capacity Warning',
      status: 'pending',
      message: 'Manual test: Enter estimates exceeding capacity and verify RED highlighting',
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Forecast Feature Self-Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((test) => (
            <div key={test.name} className="flex items-start gap-3 p-4 border rounded">
              {test.status === 'pass' && <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />}
              {test.status === 'fail' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
              {test.status === 'pending' && <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />}
              <div className="flex-1">
                <div className="font-medium">{test.name}</div>
                <div className="text-sm text-muted-foreground">{test.message}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
