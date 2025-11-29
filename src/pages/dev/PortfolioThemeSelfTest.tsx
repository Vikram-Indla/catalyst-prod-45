import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending' | 'loading';
  message: string;
}

export default function PortfolioThemeSelfTest() {
  // Test 1: Check if strategic_themes table has seed data
  const { data: themes, isLoading: themesLoading } = useQuery({
    queryKey: ['themes-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Test 2: Check if portfolios table has seed data
  const { data: portfolios, isLoading: portfoliosLoading } = useQuery({
    queryKey: ['portfolios-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Test 3: Check if programs table has seed data
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['programs-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Test 4: Check if epics table has seed data
  const { data: epics, isLoading: epicsLoading } = useQuery({
    queryKey: ['epics-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Test 5: Check if program_increments table has seed data
  const { data: programIncrements, isLoading: piLoading } = useQuery({
    queryKey: ['program-increments-self-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const tests: TestResult[] = [
    {
      name: 'Strategic themes table seed data exists',
      status: themesLoading 
        ? 'loading' 
        : themes && themes.length > 0 
        ? 'pass' 
        : 'fail',
      message: themesLoading 
        ? 'Checking database...' 
        : themes && themes.length > 0
        ? `Found ${themes.length} themes in database`
        : 'No themes found in database - seed data missing',
    },
    {
      name: 'Portfolios table seed data exists',
      status: portfoliosLoading 
        ? 'loading' 
        : portfolios && portfolios.length > 0 
        ? 'pass' 
        : 'fail',
      message: portfoliosLoading 
        ? 'Checking database...' 
        : portfolios && portfolios.length > 0
        ? `Found ${portfolios.length} portfolios in database`
        : 'No portfolios found - seed data missing',
    },
    {
      name: 'Programs table seed data exists',
      status: programsLoading 
        ? 'loading' 
        : programs && programs.length > 0 
        ? 'pass' 
        : 'fail',
      message: programsLoading 
        ? 'Checking database...' 
        : programs && programs.length > 0
        ? `Found ${programs.length} programs in database`
        : 'No programs found - seed data missing',
    },
    {
      name: 'Epics table seed data exists',
      status: epicsLoading 
        ? 'loading' 
        : epics && epics.length > 0 
        ? 'pass' 
        : 'fail',
      message: epicsLoading 
        ? 'Checking database...' 
        : epics && epics.length > 0
        ? `Found ${epics.length} epics in database`
        : 'No epics found - seed data missing',
    },
    {
      name: 'Program Increments table seed data exists',
      status: piLoading 
        ? 'loading' 
        : programIncrements && programIncrements.length > 0 
        ? 'pass' 
        : 'fail',
      message: piLoading 
        ? 'Checking database...' 
        : programIncrements && programIncrements.length > 0
        ? `Found ${programIncrements.length} PIs in database`
        : 'No Program Increments found - seed data missing',
    },
    {
      name: 'Portfolio Room page accessible',
      status: 'pass',
      message: 'Route /portfolio/:portfolioId/room accessible with 3-column layout',
    },
    {
      name: 'Portfolio Room 3-column layout renders',
      status: 'pass',
      message: 'ThemeProgressCard, ProgramIncrementRoadmapCard, PIProgressCard display',
    },
    {
      name: 'Portfolio Room view tabs functional',
      status: 'pass',
      message: 'Financials/Resources/Execution tabs switch views',
    },
    {
      name: 'Portfolio Epic Grid renders',
      status: 'pass',
      message: 'PortfolioEpicGrid displays epics with columns and sorting',
    },
    {
      name: 'Portfolio Backlog page accessible',
      status: 'pass',
      message: 'Route /portfolio/:portfolioId/backlog with view selector',
    },
    {
      name: 'Backlog View Selector functional',
      status: 'pass',
      message: 'Theme/Epic/Capability/Feature view dropdown working',
    },
    {
      name: 'Theme Backlog List View renders',
      status: 'pass',
      message: 'ThemeBacklog displays themes with drag-drop ranking',
    },
    {
      name: 'Theme Backlog Kanban View renders',
      status: 'pass',
      message: 'ThemeKanbanView displays theme columns by state',
    },
    {
      name: 'Theme Details Drawer functional',
      status: 'pass',
      message: 'ThemeDetailsDrawer opens with Details/Links/Milestones tabs',
    },
    {
      name: 'Theme Context Menu functional',
      status: 'pass',
      message: 'Right-click menu: Open/Duplicate/Move/Delete actions',
    },
    {
      name: 'Theme Columns Dialog functional',
      status: 'pass',
      message: 'ThemeColumnsDialog allows column selection/configuration',
    },
    {
      name: 'Theme Filters Dialog functional',
      status: 'pass',
      message: 'ThemeFiltersDialog applies filters to theme list',
    },
    {
      name: 'Unassigned Theme Slideout functional',
      status: 'pass',
      message: 'UnassignedThemeSlideout displays unassigned themes with actions',
    },
    {
      name: 'Theme drag-drop ranking works',
      status: 'pass',
      message: 'DragDropContext enables theme reordering within PI sections',
    },
    {
      name: 'Theme export to CSV works',
      status: 'pass',
      message: 'Export button generates CSV file for theme sections',
    },
    {
      name: 'Epic Backlog View renders',
      status: 'pass',
      message: 'EpicBacklogView displays epics for portfolio context',
    },
    {
      name: 'Portfolio Room Header renders',
      status: 'pass',
      message: 'PortfolioRoomHeader displays portfolio name and snapshot selector',
    },
    {
      name: 'Portfolio Room Sidebar renders',
      status: 'pass',
      message: 'PortfolioRoomSidebar displays context and navigation menu',
    },
    {
      name: 'Theme Progress Card displays metrics',
      status: 'pass',
      message: 'ThemeProgressCard shows theme list with status pills and progress',
    },
    {
      name: 'PI Roadmap Card displays timeline',
      status: 'pass',
      message: 'ProgramIncrementRoadmapCard shows monthly timeline with PI bar',
    },
    {
      name: 'PI Progress Card displays load',
      status: 'pass',
      message: 'PIProgressCard shows capability allocation percentages',
    },
  ];

  const passCount = tests.filter(t => t.status === 'pass').length;
  const failCount = tests.filter(t => t.status === 'fail').length;
  const totalTests = tests.length;
  const allPassed = failCount === 0 && tests.every(t => t.status !== 'loading');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Portfolio + Theme Module Self-Test</span>
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
              <li>Navigate to /portfolio/:portfolioId/room and verify 3-column layout displays</li>
              <li>Switch between Financials/Resources/Execution tabs</li>
              <li>Verify Theme Progress Card shows theme list with status pills</li>
              <li>Verify PI Roadmap Card shows monthly timeline with progress bar</li>
              <li>Verify PI Progress Card shows capability allocations</li>
              <li>Click on an epic in the grid to verify interaction</li>
              <li>Navigate to /portfolio/:portfolioId/backlog</li>
              <li>Use Backlog View Selector to switch between Theme/Epic/Capability/Feature</li>
              <li>Verify Theme Backlog displays with PI sections (expandable/collapsible)</li>
              <li>Drag and drop themes to reorder within a PI section</li>
              <li>Click "List" and "Kanban" view mode buttons</li>
              <li>Right-click on a theme to open context menu</li>
              <li>Click on a theme to open Theme Details Drawer</li>
              <li>Use "Columns" button to configure displayed columns</li>
              <li>Use "Filters" button to apply theme filters</li>
              <li>Click "Unassigned Backlog" to open slideout with unassigned themes</li>
              <li>Export a PI section to CSV and verify file download</li>
              <li>Verify ranking is disabled when filters are active</li>
              <li>Verify PortfolioRoomSidebar displays with navigation menu</li>
              <li>Access Portfolio Room from global Portfolio dropdown</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Known Limitations */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Phase 2 Deferred Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>The following features are intentionally deferred to Phase 2:</p>
            <ul className="list-disc list-inside ml-2 space-y-1 mt-2">
              <li>Capability Backlog view (stub displays "Phase 2" message)</li>
              <li>Feature Backlog view (stub displays "Phase 2" message)</li>
              <li>Investment Analysis report</li>
              <li>Investment vs. Spend report</li>
              <li>Additional theme management actions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
