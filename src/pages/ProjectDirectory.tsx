import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Star, MoreHorizontal } from 'lucide-react';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Project {
  id: string;
  key: string;
  name: string;
  programName: string;
  programId: string;
  type: string;
  category: string;
  lead: { name: string; avatar?: string };
  icon: string;
  iconBg: string;
  isStarred: boolean;
}

export default function ProjectDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [starredProjects, setStarredProjects] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const { data: projectsData, isLoading, error } = useQuery({
    queryKey: ['projects-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*, portfolios(id, name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const iconColors = ['#4C9AFF', '#FF5630', '#00B8D9', '#FFC400', '#36B37E', '#6554C0'];
  const icons = ['🧭', '💼', '🏢', '🔧', '📊', '📱', '⚙️', '🚀'];

  const projects: Project[] = (projectsData || []).map((p, index) => ({
    id: p.id,
    key: p.name.substring(0, 4).toUpperCase(),
    name: p.name,
    programName: p.portfolios?.name || 'Default',
    programId: p.portfolio_id || '',
    type: 'Company-managed software',
    category: 'Software',
    lead: { name: 'Unassigned' },
    icon: icons[index % icons.length],
    iconBg: iconColors[index % iconColors.length],
    isStarred: starredProjects.has(p.id),
  }));

  const filteredProjects = projects.filter(proj =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStar = (projectId: string) => {
    setStarredProjects(prev => {
      const newSet = new Set(prev);
      newSet.has(projectId) ? newSet.delete(projectId) : newSet.add(projectId);
      return newSet;
    });
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-medium text-foreground mb-2">Error loading projects</h2>
        <p className="text-muted-foreground">Please try again.</p>
      </div>
    );
  }

  return (
    <div className="p-6 px-10 bg-card min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium text-foreground">Projects</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create project
          </Button>
          <Button variant="outline">Templates</Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 mb-4">
        <div className="relative w-[280px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="software">Software</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* TABLE */}
      {isLoading ? (
        <div className="flex justify-center py-12">Loading...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects found</p>
          <Button onClick={() => setShowCreateDialog(true)}>Create project</Button>
        </div>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_80px_200px_150px_120px_100px_50px] bg-muted px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground border-b border-border">
            <div></div>
            <div>Name</div>
            <div>Key</div>
            <div>Type</div>
            <div>Program</div>
            <div>Lead</div>
            <div>Category</div>
            <div></div>
          </div>
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}/room`)}
              className="grid grid-cols-[40px_1fr_80px_200px_150px_120px_100px_50px] px-3 py-2.5 border-b border-border bg-card items-center cursor-pointer hover:bg-muted transition-colors"
            >
              <button onClick={(e) => { e.stopPropagation(); toggleStar(project.id); }} className="p-1 bg-transparent border-none cursor-pointer">
                <Star className={`w-4 h-4 ${project.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center text-sm" style={{ background: project.iconBg }}>{project.icon}</div>
                <span className="text-sm font-medium text-primary">{project.name}</span>
              </div>
              <span className="text-sm">{project.key}</span>
              <span className="text-sm text-muted-foreground">{project.type}</span>
              <span className="text-sm text-primary">{project.programName}</span>
              <div className="flex items-center gap-2">
                <Avatar className="w-5 h-5"><AvatarFallback className="text-[8px]">UN</AvatarFallback></Avatar>
                <span className="text-sm">{project.lead.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{project.category}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>View project</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
      <CreateProjectDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}