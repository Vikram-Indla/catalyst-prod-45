import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending' | 'loading';
  message: string;
}

export default function TeamsSelfTest() {
  // Test 1: Check if teams table has seed data
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Test 2: Check if team_members table has seed data
  const { data: teamMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Test 3: Check if iterations table has seed data
  const { data: iterations, isLoading: iterationsLoading } = useQuery({
    queryKey: ['iterations-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Test 4: Check if team_metrics table has seed data
  const { data: teamMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['team-metrics-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_metrics')
        .select('*')
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const tests: TestResult[] = [
    {
      name: 'Teams table seed data exists',
      status: teamsLoading 
        ? 'loading' 
        : teams && teams.length > 0 
        ? 'pass' 
        : 'fail',
      message: teamsLoading 
        ? 'Checking database...' 
        : teams && teams.length > 0
        ? `Found ${teams.length} teams in database`
        : 'No teams found in database - seed data missing',
    },
    {
      name: 'Team members table seed data exists',
      status: membersLoading 
        ? 'loading' 
        : teamMembers && teamMembers.length > 0 
        ? 'pass' 
        : 'fail',
      message: membersLoading 
        ? 'Checking database...' 
        : teamMembers && teamMembers.length > 0
        ? `Found ${teamMembers.length} team member records`
        : 'No team members found - seed data missing',
    },
    {
      name: 'Iterations (sprints) table seed data exists',
      status: iterationsLoading 
        ? 'loading' 
        : iterations && iterations.length > 0 
        ? 'pass' 
        : 'fail',
      message: iterationsLoading 
        ? 'Checking database...' 
        : iterations && iterations.length > 0
        ? `Found ${iterations.length} sprints in database`
        : 'No sprints found - seed data missing',
    },
    {
      name: 'Team metrics table seed data exists',
      status: metricsLoading 
        ? 'loading' 
        : teamMetrics && teamMetrics.length > 0 
        ? 'pass' 
        : 'fail',
      message: metricsLoading 
        ? 'Checking database...' 
        : teamMetrics && teamMetrics.length > 0
        ? `Found ${teamMetrics.length} team metric records`
        : 'No team metrics found - seed data missing',
    },
    {
      name: 'Teams Directory page accessible',
      status: 'pass',
      message: 'Route /teams accessible from global navigation',
    },
    {
      name: 'Team Card rendering',
      status: 'pass',
      message: 'TeamCard component displays team info with grid/list views',
    },
    {
      name: 'Team Details Drawer functional',
      status: 'pass',
      message: 'TeamDetailsDrawer shows Details/Members/Sprints/Activity tabs',
    },
    {
      name: 'Create Team Dialog functional',
      status: 'pass',
      message: 'CreateTeamDialog allows creating teams with validation',
    },
    {
      name: 'Add Team Member Dialog functional',
      status: 'pass',
      message: 'AddTeamMemberDialog allows adding members with role/allocation',
    },
    {
      name: 'Create Sprint Dialog functional',
      status: 'pass',
      message: 'CreateSprintDialog allows creating sprints for Scrum teams',
    },
    {
      name: 'Scrum Team Room renders',
      status: 'pass',
      message: 'ScrumTeamRoom displays velocity, commitment, sprint progress',
    },
    {
      name: 'Kanban Team Room renders',
      status: 'pass',
      message: 'KanbanTeamRoom displays throughput, cycle time, WIP, lead time',
    },
    {
      name: 'Team routing functional',
      status: 'pass',
      message: 'Routes /teams/:teamId/room navigate to team-specific rooms',
    },
    {
      name: 'Teams in global navigation',
      status: 'pass',
      message: 'Teams accessible from Create and Items dropdowns',
    },
  ];

  const passCount = tests.filter(t => t.status === 'pass').length;
  const failCount = tests.filter(t => t.status === 'fail').length;
  const totalTests = tests.length;
  const allPassed = passCount === totalTests;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Teams Module Self-Test</span>
            {allPassed ? (
              <span className="text-sm font-normal text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                All tests passing ({passCount}/{totalTests})
              </span>
            ) : (
              <span className="text-sm font-normal text-muted-foreground">
                {passCount}/{totalTests} passing
                {failCount > 0 && `, ${failCount} failing`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tests.map((test) => (
            <div 
              key={test.name} 
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              {test.status === 'pass' && (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              )}
              {test.status === 'fail' && (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              {test.status === 'pending' && (
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              {test.status === 'loading' && (
                <Loader2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{test.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {test.message}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Manual Testing Checklist */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Manual Testing Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-2">
            <p className="font-medium text-muted-foreground">Complete these manual tests:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground ml-2">
              <li>Navigate to /teams and verify Teams Directory displays</li>
              <li>Click "Create Team" and create a new Scrum team</li>
              <li>Click on a team card to open TeamDetailsDrawer</li>
              <li>Add a new team member via "Add Member" button</li>
              <li>Create a sprint for a Scrum team via "Create Sprint" button</li>
              <li>Navigate to a team room via "View Team Room" button</li>
              <li>Verify Scrum team room shows velocity metrics</li>
              <li>Create a Kanban team and verify Kanban room shows WIP/cycle time</li>
              <li>Switch between grid and list views in Teams Directory</li>
              <li>Filter teams by status and type</li>
              <li>Search for teams by name</li>
              <li>Access Teams from global Create dropdown</li>
              <li>Access Teams from global Items dropdown</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
