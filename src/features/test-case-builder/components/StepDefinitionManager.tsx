// =====================================================
// STEP DEFINITION MANAGER
// Manage reusable BDD step definitions
// =====================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  BookOpen,
  Hash
} from 'lucide-react';
import { 
  useStepDefinitions, 
  useCreateStepDefinition,
  GherkinKeyword
} from '@/hooks/test-cases/useGherkinSteps';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StepDefinitionManagerProps {
  projectId: string;
}

const KEYWORD_COLORS: Record<GherkinKeyword, string> = {
  Given: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  When: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Then: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  And: 'bg-muted text-muted-foreground',
  But: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

export function StepDefinitionManager({ projectId }: StepDefinitionManagerProps) {
  const { data: definitions = [], isLoading } = useStepDefinitions(projectId);
  const createDefinition = useCreateStepDefinition();
  
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState<GherkinKeyword>('Given');
  const [newPattern, setNewPattern] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const filteredDefinitions = definitions.filter(
    d => d.pattern.toLowerCase().includes(search.toLowerCase()) ||
         d.keyword.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newPattern.trim()) {
      toast.error('Pattern is required');
      return;
    }

    try {
      await createDefinition.mutateAsync({
        projectId,
        keyword: newKeyword,
        pattern: newPattern.trim(),
        description: newDescription.trim() || undefined,
      });
      toast.success('Step definition created');
      setIsCreateOpen(false);
      setNewPattern('');
      setNewDescription('');
    } catch (error) {
      toast.error('Failed to create step definition');
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Step Definitions
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Definition
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Step Definition</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Keyword</label>
                  <Select
                    value={newKeyword}
                    onValueChange={(v: GherkinKeyword) => setNewKeyword(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(KEYWORD_COLORS).map(([keyword, color]) => (
                        <SelectItem key={keyword} value={keyword}>
                          <span className={cn("font-mono px-2 py-0.5 rounded", color)}>
                            {keyword}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pattern</label>
                  <Input
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    placeholder="I am logged in as {role}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{placeholder}'} for variable parts
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What this step does..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={createDefinition.isPending}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search step definitions..."
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filteredDefinitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No matching step definitions' : 'No step definitions yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDefinitions.map((def) => (
                <div
                  key={def.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("font-mono text-xs", KEYWORD_COLORS[def.keyword])}>
                          {def.keyword}
                        </Badge>
                        <span className="font-mono text-sm">{def.pattern}</span>
                      </div>
                      {def.description && (
                        <p className="text-xs text-muted-foreground">
                          {def.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Hash className="h-3 w-3" />
                      {def.usage_count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
