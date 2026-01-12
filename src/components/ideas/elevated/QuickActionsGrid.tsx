// ============================================================
// QUICK ACTIONS GRID - 3-Card Actions
// ============================================================

import { Plus, ClipboardCheck, LayoutGrid, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
}

interface QuickActionsGridProps {
  onSubmitClick: () => void;
  onScoreClick: () => void;
  onMatrixClick: () => void;
  pendingScoring?: number;
}

export function QuickActionsGrid({ 
  onSubmitClick, 
  onScoreClick, 
  onMatrixClick,
  pendingScoring = 0 
}: QuickActionsGridProps) {
  const actions: QuickAction[] = [
    {
      title: "Submit Idea",
      description: "Share your improvement suggestion",
      icon: Plus,
      iconBg: "bg-gradient-to-br from-amber-100 to-yellow-200",
      iconColor: "text-amber-600",
      onClick: onSubmitClick
    },
    {
      title: "Score Ideas",
      description: `${pendingScoring} ideas pending evaluation`,
      icon: ClipboardCheck,
      iconBg: "bg-gradient-to-br from-orange-100 to-amber-200",
      iconColor: "text-orange-600",
      onClick: onScoreClick
    },
    {
      title: "Priority Matrix",
      description: "View impact vs effort analysis",
      icon: LayoutGrid,
      iconBg: "bg-gradient-to-br from-blue-100 to-indigo-200",
      iconColor: "text-blue-600",
      onClick: onMatrixClick
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map((action) => (
        <Card 
          key={action.title}
          onClick={action.onClick}
          className="group cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white border-slate-200"
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              action.iconBg
            )}>
              <action.icon className={cn("w-6 h-6", action.iconColor)} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-slate-500">{action.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
