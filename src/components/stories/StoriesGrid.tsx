import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface Story {
  id: string;
  story_key: string | null;
  name: string;
  state: string | null;
  story_points: number | null;
  progress_pct: number | null;
  health: string | null;
  features?: { name: string } | null;
  teams?: { name: string } | null;
}

interface StoriesGridProps {
  stories: Story[];
  isLoading: boolean;
  onStoryClick: (storyId: string) => void;
  onRefetch: () => void;
}

const getStateColor = (state: string | null) => {
  switch (state) {
    case 'done': return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'in_progress': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'backlog': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

const getHealthColor = (health: string | null) => {
  switch (health) {
    case 'green': return 'bg-green-500';
    case 'yellow': return 'bg-yellow-500';
    case 'red': return 'bg-red-500';
    default: return 'bg-gray-300';
  }
};

export function StoriesGrid({ stories, isLoading, onStoryClick }: StoriesGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">No stories found</p>
        <p className="text-sm text-muted-foreground mt-1">Create your first story to get started</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Key</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="w-[120px]">State</TableHead>
          <TableHead className="w-[100px]">Points</TableHead>
          <TableHead className="w-[120px]">Progress</TableHead>
          <TableHead className="w-[150px]">Feature</TableHead>
          <TableHead className="w-[150px]">Team</TableHead>
          <TableHead className="w-[80px]">Health</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stories.map((story) => (
          <TableRow
            key={story.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onStoryClick(story.id)}
          >
            <TableCell className="font-mono text-sm">{story.story_key || '—'}</TableCell>
            <TableCell className="font-medium">{story.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className={getStateColor(story.state)}>
                {story.state || 'backlog'}
              </Badge>
            </TableCell>
            <TableCell className="text-center">{story.story_points || '—'}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-gold h-full transition-all"
                    style={{ width: `${story.progress_pct || 0}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{story.progress_pct || 0}%</span>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {story.features?.name || '—'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {story.teams?.name || '—'}
            </TableCell>
            <TableCell>
              <div className={`w-3 h-3 rounded-full ${getHealthColor(story.health)}`} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
