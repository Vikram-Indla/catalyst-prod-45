import { useState } from 'react';
import { Search, Settings, Maximize2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface OKRTreeItem {
  id: string;
  numericId: number;
  title: string;
  tier: 'strategic_goal' | 'portfolio' | 'program' | 'team';
  score: number | null;
  keyResultsProgress: number;
  owner: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
    avatarColor?: string;
  };
  children: OKRTreeItem[];
  isExpanded?: boolean;
}

interface OkrTreeProps {
  selectedSnapshot: string;
  onObjectiveClick: (objective: any) => void;
}

// Mock data matching the specification
const mockOkrTree: OKRTreeItem[] = [
  {
    id: 'sg-139',
    numericId: 139,
    title: 'Capitalize on Emerging Technology Trends',
    tier: 'strategic_goal',
    score: 0.6,
    keyResultsProgress: 60,
    owner: {
      id: 'u-1',
      name: 'Executive Team',
      initials: 'ET',
      avatarColor: '#6554C0'
    },
    children: [
      {
        id: 'po-3593',
        numericId: 3593,
        title: 'Become market leader in mobile investment and banking space',
        tier: 'portfolio',
        score: 0.8,
        keyResultsProgress: 80,
        owner: {
          id: 'u-2',
          name: 'Steve Elliott',
          initials: 'SE',
          avatarColor: '#36B37E'
        },
        children: [
          {
            id: 'pro-3595',
            numericId: 3595,
            title: 'Become Leading Financial App in Android Marketplace',
            tier: 'program',
            score: 0.9,
            keyResultsProgress: 90,
            owner: {
              id: 'u-3',
              name: 'Sarah Johnson',
              initials: 'SJ',
              avatarColor: '#0052CC'
            },
            children: [
              {
                id: 'to-3594',
                numericId: 3594,
                title: 'Grow Android Daily Active Users',
                tier: 'team',
                score: 0.4,
                keyResultsProgress: 40,
                owner: {
                  id: 'u-4',
                  name: 'Bob Owner',
                  initials: 'BO',
                  avatarColor: '#FFAB00'
                },
                children: []
              },
              {
                id: 'to-3598',
                numericId: 3598,
                title: 'High Android Marketplace Rating',
                tier: 'team',
                score: 0.6,
                keyResultsProgress: 60,
                owner: {
                  id: 'u-5',
                  name: 'Alice Manager',
                  initials: 'AM',
                  avatarColor: '#00B8D9'
                },
                children: []
              },
              {
                id: 'to-3599',
                numericId: 3599,
                title: 'Increase user retention and reduce churn',
                tier: 'team',
                score: 0.6,
                keyResultsProgress: 60,
                owner: {
                  id: 'u-6',
                  name: 'Carol Lead',
                  initials: 'CL',
                  avatarColor: '#6554C0'
                },
                children: []
              }
            ]
          },
          {
            id: 'pro-3597',
            numericId: 3597,
            title: 'Become Leading Financial App in iOS Marketplace',
            tier: 'program',
            score: 0.7,
            keyResultsProgress: 70,
            owner: {
              id: 'u-7',
              name: 'David PM',
              initials: 'DP',
              avatarColor: '#36B37E'
            },
            children: []
          }
        ]
      }
    ]
  }
];

function getScoreColor(score: number | null): string {
  if (score === null) return 'hsl(var(--okr-score-none))';
  if (score >= 0.7) return 'hsl(var(--okr-score-high))';
  if (score >= 0.4) return 'hsl(var(--okr-score-medium))';
  return 'hsl(var(--okr-score-low))';
}

function formatScore(score: number | null): string {
  if (score === null) return 'N/S';
  return score.toFixed(1);
}

function getLevelLabel(tier: string): string {
  const labels = {
    'strategic_goal': 'Strategic Goals',
    'portfolio': 'Portfolio Objectives',
    'program': 'Program Objectives',
    'team': 'Team Objectives'
  };
  return labels[tier as keyof typeof labels] || tier;
}

export function OkrTree({ selectedSnapshot, onObjectiveClick }: OkrTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['sg-139', 'po-3593', 'pro-3595']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderObjective = (item: OKRTreeItem, depth: number = 0, parentTier?: string) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const showLevelHeader = !parentTier || parentTier !== item.tier;
    const indentPx = depth * 24;

    return (
      <div key={item.id}>
        {/* Level Header - shows when tier changes */}
        {showLevelHeader && (
          <div
            className="grid items-center py-3 px-4 bg-muted/50 border-b font-semibold text-sm"
            style={{
              gridTemplateColumns: '1fr 140px 80px 80px',
              paddingLeft: `${indentPx + 16}px`
            }}
          >
            <div>{getLevelLabel(item.tier)}</div>
            <div className="text-center">Key Results<br />Progress</div>
            <div className="text-center">Score</div>
            <div className="text-center">Owner</div>
          </div>
        )}

        {/* Objective Row */}
        <div
          className="grid items-center py-3 px-4 border-b hover:bg-muted/30 cursor-pointer transition-colors"
          style={{
            gridTemplateColumns: '1fr 140px 80px 80px',
            paddingLeft: `${indentPx + 16}px`
          }}
          onClick={() => onObjectiveClick(item)}
        >
          {/* Title column with expand arrow */}
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground transition-transform"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-5" />
            )}
            <span className="text-sm text-muted-foreground min-w-[48px]">{item.numericId}</span>
            <span className="text-sm text-primary hover:underline">{item.title}</span>
          </div>

          {/* Progress Bar */}
          <div className="flex justify-center px-2">
            <div className="w-full max-w-[120px] h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.keyResultsProgress}%`,
                  backgroundColor: getScoreColor(item.score)
                }}
              />
            </div>
          </div>

          {/* Score */}
          <div className="text-center">
            <span
              className="text-sm font-semibold"
              style={{ color: getScoreColor(item.score) }}
            >
              {formatScore(item.score)}
            </span>
          </div>

          {/* Owner Avatar */}
          <div className="flex justify-center">
            <Avatar className="h-8 w-8" style={{ backgroundColor: item.owner.avatarColor }}>
              <AvatarFallback className="text-white text-xs font-semibold">
                {item.owner.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Children */}
        {isExpanded && item.children.map((child) => renderObjective(child, depth + 1, item.tier))}
      </div>
    );
  };

  return (
    <Card className="border rounded-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">OKR Tree</CardTitle>
        <p className="text-sm italic text-muted-foreground mt-1">
          Only work items tied to this Snapshot or its Program Increments are shown here
        </p>
        <div className="flex items-center justify-between mt-4">
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden">
          {mockOkrTree.map((item) => renderObjective(item, 0))}
        </div>
      </CardContent>
    </Card>
  );
}
