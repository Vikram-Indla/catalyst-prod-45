import { FileText, Search, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { onAction: (action: string) => void; }

const actions = [
  { id: 'generate', label: 'Generate Tests', icon: FileText, color: 'text-purple-600' },
  { id: 'coverage', label: 'Analyze Coverage', icon: Search, color: 'text-blue-600' },
  { id: 'prioritize', label: 'Prioritize', icon: Zap, color: 'text-orange-600' },
  { id: 'query', label: 'Query Data', icon: BarChart3, color: 'text-green-600' },
];

export function CatyAIQuickActions({ onAction }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.id} variant="outline" size="sm" onClick={() => onAction(a.id)} className="gap-2">
          <a.icon className={`h-4 w-4 ${a.color}`} />{a.label}
        </Button>
      ))}
    </div>
  );
}
