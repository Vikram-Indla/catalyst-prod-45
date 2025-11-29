import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function EpicBacklogTests() {
  const { data: testResults } = useQuery({
    queryKey: ['epic-backlog-tests'],
    queryFn: async () => {
      const results = [];

      // Test 1: Seed data exists
      const { data: portfolios } = await supabase.from('portfolios').select('count');
      results.push({
        name: 'Portfolios exist',
        passed: (portfolios as any)?.[0]?.count > 0,
        expected: '1+',
        actual: (portfolios as any)?.[0]?.count || 0,
      });

      // Test 2: Programs exist
      const { data: programs } = await supabase.from('programs').select('count');
      results.push({
        name: 'Programs exist',
        passed: (programs as any)?.[0]?.count >= 2,
        expected: '2+',
        actual: (programs as any)?.[0]?.count || 0,
      });

      // Test 3: PIs exist
      const { data: pis } = await supabase.from('program_increments').select('count');
      results.push({
        name: 'Program Increments exist',
        passed: (pis as any)?.[0]?.count >= 3,
        expected: '3+',
        actual: (pis as any)?.[0]?.count || 0,
      });

      // Test 4: Epics exist
      const { data: epics } = await supabase.from('epics').select('count');
      results.push({
        name: 'Epics exist',
        passed: (epics as any)?.[0]?.count >= 8,
        expected: '8+',
        actual: (epics as any)?.[0]?.count || 0,
      });

      // Test 5: Parked epics exist
      const { data: parked } = await supabase
        .from('epics')
        .select('count')
        .not('parked_at', 'is', null);
      results.push({
        name: 'Parked epics exist',
        passed: (parked as any)?.[0]?.count >= 2,
        expected: '2+',
        actual: (parked as any)?.[0]?.count || 0,
      });

      // Test 6: Deleted epics exist
      const { data: deleted } = await supabase
        .from('epics')
        .select('count')
        .not('deleted_at', 'is', null);
      results.push({
        name: 'Deleted epics (recycle bin) exist',
        passed: (deleted as any)?.[0]?.count >= 1,
        expected: '1+',
        actual: (deleted as any)?.[0]?.count || 0,
      });

      // Test 7: Features with epic parent exist
      const { data: features } = await supabase
        .from('features')
        .select('count')
        .not('epic_id', 'is', null);
      results.push({
        name: 'Features with epic parent exist',
        passed: (features as any)?.[0]?.count >= 4,
        expected: '4+',
        actual: (features as any)?.[0]?.count || 0,
      });

      // Test 9: Epic-PI assignments exist
      const { data: epicPIs } = await supabase.from('epic_program_increments').select('count');
      results.push({
        name: 'Epic-PI assignments exist',
        passed: (epicPIs as any)?.[0]?.count >= 3,
        expected: '3+',
        actual: (epicPIs as any)?.[0]?.count || 0,
      });

      // Test 10: Process flows exist
      const { data: processFlows } = await supabase.from('process_flows').select('count');
      results.push({
        name: 'Process flows exist',
        passed: (processFlows as any)?.[0]?.count >= 1,
        expected: '1+',
        actual: (processFlows as any)?.[0]?.count || 0,
      });

      return results;
    },
  });

  const passedTests = testResults?.filter(t => t.passed).length || 0;
  const totalTests = testResults?.length || 0;
  const allPassed = passedTests === totalTests;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Epic Backlog Self-Test</h1>
        <p className="text-muted-foreground">Automated validation of Epic Backlog feature implementation</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Test Results</h2>
          <Badge variant={allPassed ? 'default' : 'destructive'} className="text-lg px-4 py-1">
            {passedTests} / {totalTests} Passed
          </Badge>
        </div>

        <div className="space-y-3">
          {testResults?.map((test, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                test.passed ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {test.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <div>
                  <div className="font-medium">{test.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Expected: {test.expected} | Actual: {test.actual}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!allPassed && (
          <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <div className="font-medium text-warning-foreground">Action Required</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Some tests are failing. Run the seed data script or check database configuration.
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Manual Test Checklist</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <input type="checkbox" id="test-1" />
            <label htmlFor="test-1">Load Epic Backlog, switch List/Kanban views</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-2" />
            <label htmlFor="test-2">Quick add epic and verify it appears at bottom</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-3" />
            <label htmlFor="test-3">Drag-rank epics and verify rank persisted</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-4" />
            <label htmlFor="test-4">Right-click: Duplicate epic</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-5" />
            <label htmlFor="test-5">Right-click: Move to Top/Bottom/Position</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-6" />
            <label htmlFor="test-6">Right-click: Move to Program Increment</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-7" />
            <label htmlFor="test-7">Right-click: Move to Parking Lot</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-8" />
            <label htmlFor="test-8">Expand epic and view child features/capabilities</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-9" />
            <label htmlFor="test-9">Open epic details panel and verify tabs</label>
          </div>
          <div className="flex gap-2">
            <input type="checkbox" id="test-10" />
            <label htmlFor="test-10">Export CSV and verify content</label>
          </div>
        </div>
      </Card>
    </div>
  );
}
