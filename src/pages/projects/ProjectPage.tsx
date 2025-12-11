import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, MoreHorizontal, ChevronRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { mockProjectData } from '../../data/mockProjectData';
import SummaryView from './views/SummaryView';
import ListView from './views/ListView';
import KanbanView from './views/KanbanView';

export default function ProjectPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [activeTab, setActiveTab] = useState('summary');
  
  const project = mockProjectData;

  return (
    <div className="flex flex-col min-h-screen bg-background w-full">
      {/* BREADCRUMBS */}
      <div className="px-6 py-3 border-b border-border bg-background">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <a href="/projects" className="hover:text-foreground transition-colors">Projects</a>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{project.name}</span>
        </nav>
      </div>

      {/* PROJECT HEADER */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center text-base">
            📊
          </div>
          <h1 className="text-2xl font-medium text-foreground">
            {project.name}
          </h1>
          <span className="text-sm text-muted-foreground">
            {project.key}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-6 bg-background">
          <TabsList className="h-auto bg-transparent rounded-none gap-1">
            <TabsTrigger 
              value="summary"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3"
            >
              Summary
            </TabsTrigger>
            <TabsTrigger 
              value="list"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3"
            >
              List
            </TabsTrigger>
            <TabsTrigger 
              value="kanban"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3"
            >
              Kanban board
            </TabsTrigger>
            <TabsTrigger 
              value="all-work"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none py-3 px-3"
            >
              All work
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="flex-1 m-0">
          <SummaryView project={project} />
        </TabsContent>

        <TabsContent value="list" className="flex-1 m-0">
          <ListView project={project} />
        </TabsContent>

        <TabsContent value="kanban" className="flex-1 m-0">
          <KanbanView project={project} />
        </TabsContent>

        <TabsContent value="all-work" className="flex-1 m-0">
          <ListView project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
