// ============================================================
// MY TASKS RIGHT PANEL
// Planner V9: Productivity widgets and insights panel
// ============================================================

import { cn } from '@/lib/utils';
import { MyTasksRightPanelWrapper } from './MyTasksLayout';
import { 
  FocusTimer, 
  TodaysSummary, 
  RecentActivity, 
  KeyboardShortcuts 
} from './widgets';

interface MyTasksRightPanelProps {
  className?: string;
}

export function MyTasksRightPanel({ className }: MyTasksRightPanelProps) {
  return (
    <MyTasksRightPanelWrapper className={className}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Focus Timer */}
        <FocusTimer />

        {/* Today's Summary */}
        <TodaysSummary />

        {/* Recent Activity */}
        <RecentActivity />

        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts />
      </div>
    </MyTasksRightPanelWrapper>
  );
}
