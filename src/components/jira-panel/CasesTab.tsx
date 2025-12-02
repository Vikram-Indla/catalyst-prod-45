import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Link, Eye, Play, Unlink, Search } from 'lucide-react';
import { LinkedCase } from '@/types/jira-panel';
import { getLinkedCases, unlinkCases } from '@/services/jiraPanelService';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CasesTabProps {
  workItemId: string;
  onCreateCase: () => void;
  onLinkCases: () => void;
}

export function CasesTab({ workItemId, onCreateCase, onLinkCases }: CasesTabProps) {
  const [cases, setCases] = useState<LinkedCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<LinkedCase[]>([]);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'recent'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCases();

    const handleRefresh = () => loadCases();
    window.addEventListener('jira-panel-refresh', handleRefresh);
    return () => window.removeEventListener('jira-panel-refresh', handleRefresh);
  }, [workItemId, filter]);

  useEffect(() => {
    const filtered = cases.filter(c =>
      c.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCases(filtered);
  }, [cases, searchQuery]);

  async function loadCases() {
    setIsLoading(true);
    const data = await getLinkedCases(workItemId, filter);
    setCases(data);
    setFilteredCases(data);
    setIsLoading(false);
  }

  async function handleUnlink(caseIds: string[]) {
    await unlinkCases(workItemId, caseIds);
    loadCases();
    setSelectedCases(new Set());
  }

  const toggleCaseSelection = (caseId: string) => {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId);
    } else {
      newSelected.add(caseId);
    }
    setSelectedCases(newSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'draft': return 'bg-gray-500';
      case 'deprecated': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getResultColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'blocked': return 'text-orange-600';
      case 'skipped': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b">
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-[#c69c6d] text-[#1a1a1a] hover:bg-[#b8905f]"
            onClick={onCreateCase}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Case
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onLinkCases}
          >
            <Link className="h-4 w-4 mr-1" />
            Link Existing
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="recent">Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : filteredCases.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No test cases linked</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={onCreateCase}>
                <Plus className="h-4 w-4 mr-1" />
                Create First Case
              </Button>
              <Button size="sm" variant="outline" onClick={onLinkCases}>
                <Link className="h-4 w-4 mr-1" />
                Link from Repository
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {filteredCases.map((testCase) => (
              <div
                key={testCase.id}
                className="p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedCases.has(testCase.id)}
                    onCheckedChange={() => toggleCaseSelection(testCase.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{testCase.key}</span>
                      <Badge variant="outline" className={`${getStatusColor(testCase.status)} text-white text-xs`}>
                        {testCase.status}
                      </Badge>
                      <Badge variant="outline" className={`${getPriorityColor(testCase.priority)} text-white text-xs`}>
                        {testCase.priority}
                      </Badge>
                    </div>
                    <div className="text-sm mb-2">{testCase.title}</div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {testCase.last_executed_at
                          ? new Date(testCase.last_executed_at).toLocaleDateString()
                          : 'Never executed'}
                      </span>
                      <span className={getResultColor(testCase.last_execution_status)}>
                        {testCase.last_execution_status === 'not_run' ? 'Not Executed' : testCase.last_execution_status}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <Play className="h-3 w-3 mr-1" />
                        Execute
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleUnlink([testCase.id])}
                      >
                        <Unlink className="h-3 w-3 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCases.size > 0 && (
        <div className="p-3 border-t bg-muted">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Selected: {selectedCases.size}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUnlink(Array.from(selectedCases))}
              >
                Unlink Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
