import React, { useState } from 'react';
import { Plus, MoreHorizontal, Settings, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface Program {
  id: string;
  key: string;
  name: string;
  description: string;
  lead: {
    name: string;
    avatar?: string;
  };
  projectCount: number;
  epicCount: number;
  isDefault: boolean;
  isStarred: boolean;
}

interface Epic {
  id: string;
  key: string;
  summary: string;
  status: string;
  priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
  assignee: {
    name: string;
    avatar?: string;
  } | null;
  linkedIssues: number;
  progress: number;
}

export default function ProgramDetailPage({ programKey }: { programKey: string }) {
  const [program, setProgram] = useState<Program>(mockProgram);
  const [epics] = useState<Epic[]>(mockEpics);
  const [selectedTab, setSelectedTab] = useState('epics');

  const toggleStar = () => {
    setProgram({ ...program, isStarred: !program.isStarred });
  };

  return (
    <div className="p-6 px-10 bg-muted min-h-screen">
      {/* BREADCRUMBS */}
      <div className="mb-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/programs">Programs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{program.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* PROGRAM HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-medium text-foreground m-0">
              {program.name}
            </h1>
            {program.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground mb-1.5">
            {program.key}
          </p>

          {program.description && (
            <p className="text-sm text-foreground mb-2">
              {program.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Lead:</span>
              <Avatar className="w-4 h-4">
                <AvatarImage src={program.lead.avatar} />
                <AvatarFallback className="text-[8px]">
                  {program.lead.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{program.lead.name}</span>
            </div>
            <span>•</span>
            <span>{program.projectCount} projects</span>
            <span>•</span>
            <span>{program.epicCount} epics</span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleStar}
          >
            <Star className={`w-4 h-4 mr-1 ${program.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            {program.isStarred ? 'Starred' : 'Star'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={`/programs/${programKey}/settings`}>
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </a>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit program</DropdownMenuItem>
              <DropdownMenuItem>Archive program</DropdownMenuItem>
              <DropdownMenuItem>Delete program</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* TABS */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-0 w-full justify-start">
          <TabsTrigger 
            value="epics"
            className="text-sm px-0 mr-6 pb-3 pt-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none bg-transparent"
          >
            Epics ({epics.length})
          </TabsTrigger>
          <TabsTrigger 
            value="projects"
            className="text-sm px-0 mr-6 pb-3 pt-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none bg-transparent"
          >
            Projects ({program.projectCount})
          </TabsTrigger>
          <TabsTrigger 
            value="settings"
            className="text-sm px-0 mr-6 pb-3 pt-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none bg-transparent"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        {/* EPICS TAB */}
        <TabsContent value="epics" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-foreground m-0">
              Epics in this program
            </h2>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Create epic
            </Button>
          </div>

          <EpicsList epics={epics} programKey={programKey} />
        </TabsContent>

        {/* PROJECTS TAB */}
        <TabsContent value="projects" className="mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Projects in this program
          </h2>
          <p className="text-xs text-muted-foreground">
            Projects list will be implemented in Phase 3
          </p>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Program settings
          </h2>
          <p className="text-xs text-muted-foreground">
            Settings will be implemented in Phase 2.4
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// EPICS LIST COMPONENT
// ============================================

function EpicsList({ epics, programKey }: { epics: Epic[]; programKey: string }) {
  if (epics.length === 0) {
    return (
      <div className="bg-card border border-border rounded p-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          No epics in this program yet
        </p>
        <Button>
          Create your first epic
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded overflow-hidden">
      {epics.map((epic, index) => (
        <EpicListItem
          key={epic.id}
          epic={epic}
          programKey={programKey}
          isLast={index === epics.length - 1}
        />
      ))}
    </div>
  );
}

// ============================================
// EPIC LIST ITEM
// ============================================

function EpicListItem({ epic, programKey, isLast }: { epic: Epic; programKey: string; isLast: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      highest: '#DE350B',
      high: '#FF5630',
      medium: '#FF991F',
      low: '#36B37E',
      lowest: '#00875A',
    };
    return colors[priority] || '#6B778C';
  };

  return (
    <a
      href={`/programs/${programKey}/epics/${epic.key}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center gap-3 px-3 py-2 no-underline transition-colors ${
        isHovered ? 'bg-muted' : 'bg-transparent'
      } ${!isLast ? 'border-b border-border' : ''}`}
    >
      {/* PRIORITY INDICATOR */}
      <div 
        className="w-1 h-6 rounded shrink-0"
        style={{ backgroundColor: getPriorityColor(epic.priority) }}
      />

      {/* EPIC INFO */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-semibold text-primary">
            {epic.key}
          </span>
          <Badge variant="secondary">{epic.status}</Badge>
        </div>
        <div className="text-sm font-medium text-foreground truncate">
          {epic.summary}
        </div>
      </div>

      {/* METADATA */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-[11px] text-muted-foreground">
          {epic.linkedIssues} linked issues
        </div>

        <div className="w-[60px] h-1.5 bg-muted rounded overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all"
            style={{ width: `${epic.progress}%` }}
          />
        </div>

        <div className="text-[11px] text-muted-foreground w-8 text-right">
          {epic.progress}%
        </div>

        {epic.assignee && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="w-5 h-5">
                  <AvatarImage src={epic.assignee.avatar} />
                  <AvatarFallback className="text-[8px]">
                    {epic.assignee.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                {epic.assignee.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </a>
  );
}

// ============================================
// MOCK DATA
// ============================================

const mockProgram: Program = {
  id: '1',
  key: 'PROD',
  name: 'Product Program',
  description: 'Main product development program with all product-related epics and features',
  lead: {
    name: 'John Doe',
    avatar: undefined,
  },
  projectCount: 5,
  epicCount: 12,
  isDefault: false,
  isStarred: false,
};

const mockEpics: Epic[] = [
  {
    id: '1',
    key: 'PROD-1',
    summary: 'User Authentication & Authorization System',
    status: 'In Progress',
    priority: 'highest',
    assignee: {
      name: 'John Doe',
      avatar: undefined,
    },
    linkedIssues: 24,
    progress: 65,
  },
  {
    id: '2',
    key: 'PROD-2',
    summary: 'Payment Gateway Integration',
    status: 'To Do',
    priority: 'high',
    assignee: {
      name: 'Jane Smith',
      avatar: undefined,
    },
    linkedIssues: 18,
    progress: 30,
  },
  {
    id: '3',
    key: 'PROD-3',
    summary: 'Dashboard Analytics & Reporting',
    status: 'In Progress',
    priority: 'medium',
    assignee: {
      name: 'Bob Johnson',
      avatar: undefined,
    },
    linkedIssues: 12,
    progress: 45,
  },
  {
    id: '4',
    key: 'PROD-4',
    summary: 'Mobile App Optimization',
    status: 'Done',
    priority: 'low',
    assignee: null,
    linkedIssues: 8,
    progress: 100,
  },
];