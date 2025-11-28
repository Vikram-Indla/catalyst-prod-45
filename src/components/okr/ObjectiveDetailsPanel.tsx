import { useState } from 'react';
import { useObjective, useUpdateObjective } from '@/hooks/useObjectives';
import { useKeyResults } from '@/hooks/useKeyResults';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Share2, MoreVertical, Save } from 'lucide-react';
import { KeyResultsList } from './KeyResultsList';

interface ObjectiveDetailsPanelProps {
  objectiveId: string;
}

export function ObjectiveDetailsPanel({ objectiveId }: ObjectiveDetailsPanelProps) {
  const { data: objective, isLoading } = useObjective(objectiveId);
  const { data: keyResults = [] } = useKeyResults(objectiveId);
  const updateObjective = useUpdateObjective();
  
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading || !objective) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-24 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const handleSave = () => {
    if (summary || description) {
      updateObjective.mutate({
        id: objectiveId,
        ...(summary && { summary }),
        ...(description && { description }),
      });
    }
    setIsEditing(false);
    setSummary('');
    setDescription('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-500/20 text-green-700';
      case 'at_risk':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'off_track':
        return 'bg-red-500/20 text-red-700';
      case 'completed':
        return 'bg-blue-500/20 text-blue-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  const getScoreColor = (score?: number) => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Objective {objective.id.slice(0, 8)}
          </Badge>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Input
              value={summary || objective.summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Objective summary"
              className="text-xl font-semibold"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <h2
            className="text-2xl font-bold cursor-pointer hover:text-primary"
            onClick={() => setIsEditing(true)}
          >
            {objective.summary}
          </h2>
        )}

        <div className="flex items-center gap-3">
          <Badge variant="outline" className={getStatusColor(objective.status)}>
            {objective.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge variant="secondary">{objective.tier}</Badge>
          {objective.score !== null && objective.score !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Score:</span>
              <span className={`text-lg font-semibold ${getScoreColor(objective.score)}`}>
                {objective.score.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Description</h3>
        {isEditing ? (
          <Textarea
            value={description || objective.description || ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={4}
          />
        ) : (
          <p
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={() => setIsEditing(true)}
          >
            {objective.description || 'Click to add a description...'}
          </p>
        )}
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">KR Progress</span>
            <span className="font-medium">{Math.round(objective.key_result_progress * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${objective.key_result_progress * 100}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Work Progress</span>
            <span className="font-medium">{Math.round(objective.work_progress * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${objective.work_progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="key-results" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="key-results">Key Results</TabsTrigger>
          <TabsTrigger value="aligned-work">Aligned Work</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
        </TabsList>

        <TabsContent value="key-results" className="space-y-4">
          <KeyResultsList objectiveId={objectiveId} keyResults={keyResults} />
        </TabsContent>

        <TabsContent value="aligned-work" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {/* TODO(JK): Implement aligned work items (Epics, Features, Capabilities, Dependencies, Risks, Impediments) */}
            Aligned work items will be displayed here.
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Tier</div>
                <div className="font-medium">{objective.tier}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Health</div>
                <Badge variant="outline">{objective.health}</Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Start Date</div>
                <div className="font-medium">{objective.start_date || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Due Date</div>
                <div className="font-medium">{objective.due_date || '—'}</div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="discussions" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {/* TODO(JK): Implement discussions/comments section */}
            Discussions will be displayed here.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
