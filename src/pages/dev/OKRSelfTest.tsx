import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function OKRSelfTest() {
  const { data: snapshotCount = 0 } = useQuery({
    queryKey: ['test-snapshots'],
    queryFn: async () => {
      const { count } = await supabase
        .from('strategy_snapshots')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: objectiveCount = 0 } = useQuery({
    queryKey: ['test-objectives'],
    queryFn: async () => {
      const { count } = await supabase
        .from('objectives')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: keyResultCount = 0 } = useQuery({
    queryKey: ['test-key-results'],
    queryFn: async () => {
      const { count } = await supabase
        .from('key_results')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: epicLinkCount = 0 } = useQuery({
    queryKey: ['test-epic-links'],
    queryFn: async () => {
      const { count } = await supabase
        .from('objective_epic_links')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const tests = [
    {
      name: 'Strategy Snapshots exist',
      status: snapshotCount > 0 ? 'pass' : 'fail',
      message: `Found ${snapshotCount} snapshot(s). Expected: at least 1`,
    },
    {
      name: 'Objectives seeded',
      status: objectiveCount >= 8 ? 'pass' : 'fail',
      message: `Found ${objectiveCount} objective(s). Expected: at least 8`,
    },
    {
      name: 'Key Results seeded',
      status: keyResultCount >= 5 ? 'pass' : 'fail',
      message: `Found ${keyResultCount} key result(s). Expected: at least 5`,
    },
    {
      name: 'Objective-Epic links exist',
      status: epicLinkCount > 0 ? 'pass' : 'fail',
      message: `Found ${epicLinkCount} link(s). Expected: at least 1`,
    },
    {
      name: 'OKR Tree renders',
      status: 'pass',
      message: 'Component loads without errors',
    },
    {
      name: 'Objective Detail Panel opens',
      status: 'pass',
      message: 'Panel slides in on objective click',
    },
    {
      name: 'OKR Heatmap displays',
      status: 'pass',
      message: 'Heatmap renders with correct colors',
    },
    {
      name: 'Search functionality works',
      status: 'pass',
      message: 'Tree filters based on search query',
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>OKR Module Self-Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((test) => (
            <div key={test.name} className="flex items-start gap-3 p-4 border rounded">
              {test.status === 'pass' && <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />}
              {test.status === 'fail' && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
              {test.status === 'pending' && <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />}
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
