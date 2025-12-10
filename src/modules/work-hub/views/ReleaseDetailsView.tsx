import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, MoreHorizontal, Edit2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface WorkItem {
  id: string;
  key: string;
  summary: string;
  type: string;
  status: string;
  assignee: string | null;
}

const mockWorkItems: WorkItem[] = [
  { id: '1', key: 'PROJ-10', summary: 'Implement OAuth login', type: 'Story', status: 'Done', assignee: 'John D.' },
  { id: '2', key: 'PROJ-11', summary: 'Add user profile page', type: 'Story', status: 'In Progress', assignee: 'Sarah M.' },
  { id: '3', key: 'PROJ-12', summary: 'Fix login redirect bug', type: 'Defect', status: 'To Do', assignee: null },
  { id: '4', key: 'PROJ-13', summary: 'Update API documentation', type: 'Task', status: 'Done', assignee: 'Mike R.' },
];

const typeColors: Record<string, string> = {
  Story: 'bg-green-500',
  Task: 'bg-blue-500',
  Defect: 'bg-red-500',
  Feature: 'bg-purple-500',
};

export function ReleaseDetailsView() {
  const { versionId, projectKey } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Mock release data
  const release = {
    id: versionId,
    name: 'Version 2.0',
    status: 'unreleased' as const,
    startDate: '2024-11-20',
    releaseDate: '2024-12-20',
    description: 'Major update with new dashboard and improved performance',
    driver: null as string | null,
    contributors: ['John D.', 'Sarah M.', 'Mike R.'],
    approvers: [] as string[],
    progress: { done: 8, inProgress: 5, toDo: 7 },
  };

  const handleBack = () => {
    const basePath = projectKey ? `/projects/${projectKey}` : '/work-hub-test';
    navigate(`${basePath}/releases`);
  };

  const filteredItems = mockWorkItems.filter((item) => {
    const matchesSearch = item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status.toLowerCase().replace(' ', '-') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = release.progress.done + release.progress.inProgress + release.progress.toDo;
  const progressPercent = total > 0 ? Math.round((release.progress.done / total) * 100) : 0;

  return (
    <div className="h-full flex bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground">
              Spaces / {projectKey || 'Project'} / Releases
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{release.name}</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">Give feedback</Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Release notes
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Editable Header Section */}
          <Card className="mb-6">
            <CardHeader className="py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Edit2 className="h-4 w-4" />
                <span className="text-sm">Give this section a name</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                placeholder="Add a description for this release..."
                className="min-h-20 resize-none"
                defaultValue={release.description}
              />
            </CardContent>
          </Card>

          {/* Related Work */}
          <Card className="mb-6">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Related work (0)</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">No related work items</p>
            </CardContent>
          </Card>

          {/* Designs */}
          <Card className="mb-6">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Designs (0)</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">No designs attached</p>
            </CardContent>
          </Card>

          {/* Work Items */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Work items ({mockWorkItems.length})</CardTitle>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add work items
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Filters */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search work items"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="to-do">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Work Items List */}
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <div className={cn('w-3 h-3 rounded-sm', typeColors[item.type])} />
                    <span className="text-sm font-medium text-primary">{item.key}</span>
                    <span className="text-sm flex-1 truncate">{item.summary}</span>
                    <Badge variant="outline" className="text-xs">{item.status}</Badge>
                    {item.assignee ? (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {item.assignee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="w-80 border-l border-border bg-card overflow-auto">
        <div className="p-4 space-y-6">
          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <Select defaultValue={release.status}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unreleased">Unreleased</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start date</label>
              <p className="text-sm mt-1">{release.startDate || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Release date</label>
              <p className="text-sm mt-1">{release.releaseDate || '-'}</p>
            </div>
          </div>

          {/* Driver */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Driver</label>
            <p className="text-sm mt-1 text-muted-foreground">{release.driver || 'Unassigned'}</p>
          </div>

          {/* Contributors */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contributors</label>
            <div className="flex -space-x-2 mt-2">
              {release.contributors.map((contributor) => (
                <Avatar key={contributor} className="h-8 w-8 border-2 border-card">
                  <AvatarFallback className="text-xs">
                    {contributor.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <p className="text-sm mt-1">{release.description}</p>
          </div>

          {/* Approvers */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approvers</label>
            <div className="mt-2">
              {release.approvers.length === 0 ? (
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  <Plus className="h-4 w-4" />
                  Add approver
                </Button>
              ) : (
                release.approvers.map((approver) => (
                  <Badge key={approver} variant="secondary">{approver}</Badge>
                ))
              )}
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</label>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>{progressPercent}% complete</span>
              </div>
              <Progress value={progressPercent} className="h-2 mb-3" />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span className="text-muted-foreground">Done</span>
                  </div>
                  <span>{release.progress.done}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span className="text-muted-foreground">In progress</span>
                  </div>
                  <span>{release.progress.inProgress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-muted-foreground/30" />
                    <span className="text-muted-foreground">To do</span>
                  </div>
                  <span>{release.progress.toDo}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReleaseDetailsView;
