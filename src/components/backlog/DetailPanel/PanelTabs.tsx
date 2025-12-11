import { FileText, Palette, Inbox, TrendingUp, Gem, Target, DollarSign, BarChart3, Link as LinkIcon, Zap } from 'lucide-react';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
  { id: 'design', label: 'Design', icon: <Palette className="w-4 h-4" /> },
  { id: 'intake', label: 'Intake', icon: <Inbox className="w-4 h-4" /> },
  { id: 'benefits', label: 'Benefits', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'value', label: 'Value', icon: <Gem className="w-4 h-4" /> },
  { id: 'milestones', label: 'Milestones', icon: <Target className="w-4 h-4" /> },
  { id: 'spend', label: 'Spend', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'forecast', label: 'Forecast', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'technical-scoring', label: 'Technical Scoring', icon: <Zap className="w-4 h-4" /> },
  { id: 'links', label: 'Links', icon: <LinkIcon className="w-4 h-4" /> },
];

interface PanelTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function PanelTabs({ activeTab, onTabChange }: PanelTabsProps) {
  return (
    <div className="flex border-b border-border px-6 overflow-x-auto scrollbar-hide">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-all ${
            activeTab === tab.id
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
