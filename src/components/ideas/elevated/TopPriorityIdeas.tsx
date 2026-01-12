// ============================================================
// TOP PRIORITY IDEAS - Ranked by votes/impact
// ============================================================

import { TrendingUp, ChevronRight, Zap, Box, ThumbsUp, Lightbulb } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TopPriorityIdea {
  id: string;
  title: string;
  category: string;
  idea_type: 'standard' | 'quick_win' | 'strategic';
  for_votes: number;
  impactScore?: number;
}

interface TopPriorityIdeasProps {
  ideas: TopPriorityIdea[];
  loading?: boolean;
  onIdeaClick?: (id: string) => void;
  onViewAll?: () => void;
}

const TYPE_STYLES = {
  quick_win: { icon: Zap, bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Quick Win' },
  strategic: { icon: Box, bg: 'bg-purple-100', text: 'text-purple-700', label: 'Strategic' },
  standard: { icon: null, bg: '', text: '', label: '' },
};

export function TopPriorityIdeas({ 
  ideas, 
  loading = false,
  onIdeaClick,
  onViewAll 
}: TopPriorityIdeasProps) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Top Priority Ideas
          </CardTitle>
        </div>
        {onViewAll && (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-slate-500 hover:text-blue-600"
            onClick={onViewAll}
          >
            See all
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="py-12 text-center">
            <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No ideas yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {ideas.map((idea) => {
              const typeConfig = TYPE_STYLES[idea.idea_type];
              const TypeIcon = typeConfig.icon;
              
              return (
                <div
                  key={idea.id}
                  onClick={() => onIdeaClick?.(idea.id)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  {/* Type Badge */}
                  {TypeIcon && (
                    <Badge className={cn("gap-1 font-medium", typeConfig.bg, typeConfig.text)}>
                      <TypeIcon className="w-3 h-3" />
                      {typeConfig.label}
                    </Badge>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {idea.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{idea.category}</p>
                  </div>

                  {/* Votes */}
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="text-sm font-semibold">{idea.for_votes}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
