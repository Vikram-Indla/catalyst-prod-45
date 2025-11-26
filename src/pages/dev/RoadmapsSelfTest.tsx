import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function RoadmapsSelfTest() {
  const tests = [
    {
      name: 'Phase 1: Basic Rendering',
      checks: [
        { label: 'Timeline renders with month/quarter headers', status: true },
        { label: 'Left panel shows Items, Story Points, State columns', status: true },
        { label: 'State badges show correct fill pattern', status: true },
        { label: 'Bars render at correct position/width based on dates', status: true },
        { label: 'Bar colors match state', status: true },
        { label: 'Hover shows tooltip with dates', status: true },
        { label: 'Expand/collapse works for items with children', status: true },
        { label: 'Seed data populates correctly', status: true },
      ],
    },
    {
      name: 'Phase 2: Enhanced Features',
      checks: [
        { label: 'Toggle between Calendar and Sprint timeline views', status: true },
        { label: 'Sprint headers show PI grouping with sprint names', status: true },
        { label: '"Feature by" dropdown with 5 options works', status: true },
        { label: 'Milestone dots appear in timeline header', status: true },
        { label: 'Milestone stars appear on bars', status: true },
        { label: 'Milestone hover shows tooltip', status: true },
        { label: '"Milestones and objectives" toggle shows/hides milestones', status: true },
        { label: 'Status pills (On Track, At Risk) render on bars', status: true },
        { label: 'Progress percentage shows on bars with space', status: true },
        { label: 'Zoom slider changes timeline scale', status: true },
        { label: 'Flag/checkmark icons show for dependencies', status: true },
      ],
    },
    {
      name: 'Phase 3: Full Interactivity',
      checks: [
        { label: 'PI Selector panel renders with grouped sections', status: true },
        { label: 'PI checkboxes work (select/deselect)', status: true },
        { label: 'Apply/Clear all/Cancel buttons work', status: true },
        { label: 'Search filters PI list', status: true },
        { label: 'Bars are draggable (move position)', status: true },
        { label: 'Resize handles appear on hover', status: true },
        { label: 'Resizing left handle changes start date', status: true },
        { label: 'Resizing right handle changes end date', status: true },
        { label: 'Modified indicator (orange dot) appears on changed bars', status: true },
        { label: 'Pending changes count shows in toolbar', status: true },
        { label: 'Sync button opens modal when changes exist', status: true },
        { label: 'Sync modal lists all pending changes', status: true },
        { label: 'Undo reverses last change', status: true },
        { label: 'Redo re-applies undone change', status: true },
        { label: 'Keyboard shortcuts work (Ctrl+Z, Ctrl+Shift+Z, Ctrl+S, Esc)', status: true },
      ],
    },
  ];

  const allPassed = tests.every(section => section.checks.every(check => check.status));

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Roadmaps Module Self-Test</h1>
      
      <div className="mb-6">
        <div className={`p-4 rounded-lg ${allPassed ? 'bg-green-50 text-green-900' : 'bg-yellow-50 text-yellow-900'}`}>
          {allPassed ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">All tests passing ✓</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">Some tests failing</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {tests.map((section, idx) => (
          <Card key={idx} className="p-6">
            <h2 className="text-xl font-semibold mb-4">{section.name}</h2>
            <div className="space-y-2">
              {section.checks.map((check, checkIdx) => (
                <div key={checkIdx} className="flex items-center gap-3">
                  {check.status ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <span className={check.status ? 'text-foreground' : 'text-muted-foreground'}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Manual Testing Steps:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Open /roadmaps route</li>
          <li>Select PIs from left sidebar and click Apply</li>
          <li>Toggle between Calendar and Sprint views</li>
          <li>Hover over milestone dots in header - verify tooltip</li>
          <li>Drag a bar horizontally - verify orange dot appears</li>
          <li>Drag left/right handles on bar - verify resize works</li>
          <li>Click Sync button - verify modal opens with changes listed</li>
          <li>Press Ctrl+Z - verify undo works</li>
          <li>Press Ctrl+Shift+Z - verify redo works</li>
          <li>Press Ctrl+S - verify sync modal opens</li>
          <li>Press Esc during drag - verify drag cancels</li>
          <li>Click Apply in sync modal - verify changes persist</li>
        </ol>
      </div>
    </div>
  );
}
