import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, LayoutGrid, List, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateProgramDialog } from '@/components/programs/CreateProgramDialog';
import { cn } from '@/lib/utils';

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
  updatedAt: Date;
}

export default function ProgramDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [starredPrograms, setStarredPrograms] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch programs from portfolios table (Programs in UI = portfolios in DB)
  const { data: programsData, isLoading, error } = useQuery({
    queryKey: ['programs-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*, programs(id)')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Transform data to Program interface
  const programs: Program[] = (programsData || []).map(p => ({
    id: p.id,
    key: p.name.substring(0, 4).toUpperCase(),
    name: p.name,
    description: 'No description provided',
    lead: {
      name: 'Unassigned',
      avatar: undefined,
    },
    projectCount: p.programs?.length || 0,
    epicCount: 0,
    isDefault: p.name === 'Default',
    isStarred: starredPrograms.has(p.id),
    updatedAt: new Date(p.updated_at || p.created_at),
  }));

  const filteredPrograms = programs.filter(prog =>
    prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prog.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStar = (programId: string) => {
    setStarredPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  const handleProgramClick = (programId: string) => {
    navigate(`/program/${programId}/room`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">Error loading programs</h2>
            <p className="text-sm text-muted-foreground">
              There was an error loading the program directory. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-medium text-foreground mb-1">
            Programs
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredPrograms.length} program{filteredPrograms.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create program
        </Button>
      </div>

      {/* CONTROLS BAR */}
      <Card className="mb-6">
        <CardContent className="p-4 flex justify-between items-center gap-4">
          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* View Toggle */}
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CONTENT */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPrograms.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">No programs found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search query' : 'Create your first program to get started'}
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setShowCreateDialog(true)}>
                Create program
              </Button>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <ProgramGrid 
          programs={filteredPrograms}
          onToggleStar={toggleStar}
          onProgramClick={handleProgramClick}
        />
      ) : (
        <ProgramList 
          programs={filteredPrograms}
          onToggleStar={toggleStar}
          onProgramClick={handleProgramClick}
        />
      )}

      {/* CREATE PROGRAM DIALOG */}
      <CreateProgramDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}

// ============================================
// PROGRAM GRID VIEW
// ============================================

interface ProgramGridProps {
  programs: Program[];
  onToggleStar: (id: string) => void;
  onProgramClick: (id: string) => void;
}

function ProgramGrid({ programs, onToggleStar, onProgramClick }: ProgramGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
      {programs.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          onToggleStar={() => onToggleStar(program.id)}
          onClick={() => onProgramClick(program.id)}
        />
      ))}
    </div>
  );
}

// ============================================
// PROGRAM CARD COMPONENT
// ============================================

interface ProgramCardProps {
  program: Program;
  onToggleStar: () => void;
  onClick: () => void;
}

function ProgramCard({ program, onToggleStar, onClick }: ProgramCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TooltipProvider>
      <Card
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "cursor-pointer transition-all duration-150 relative",
          isHovered && "shadow-lg -translate-y-0.5"
        )}
      >
        <CardContent className="p-6">
          {/* STAR BUTTON */}
          <div className={cn(
            "absolute top-3 right-3 transition-opacity duration-150",
            isHovered || program.isStarred ? "opacity-100" : "opacity-0"
          )}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleStar();
                  }}
                >
                  <Star 
                    className={cn(
                      "h-4 w-4",
                      program.isStarred 
                        ? "fill-amber-400 text-amber-400" 
                        : "text-muted-foreground"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {program.isStarred ? 'Unstar' : 'Star'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* PROGRAM INFO */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-foreground">
                {program.name}
              </h3>
              {program.isDefault && (
                <Badge variant="secondary">Default</Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-1">
              {program.key}
            </p>

            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
              {program.description}
            </p>
          </div>

          {/* METADATA */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{program.projectCount} project{program.projectCount !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{program.epicCount} epic{program.epicCount !== 1 ? 's' : ''}</span>
            </div>

            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={program.lead.avatar} alt={program.lead.name} />
                  <AvatarFallback className="text-xs">
                    {program.lead.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{program.lead.name}</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ============================================
// PROGRAM LIST VIEW
// ============================================

interface ProgramListProps {
  programs: Program[];
  onToggleStar: (id: string) => void;
  onProgramClick: (id: string) => void;
}

function ProgramList({ programs, onToggleStar, onProgramClick }: ProgramListProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {programs.map((program, index) => (
          <ProgramListItem
            key={program.id}
            program={program}
            onToggleStar={() => onToggleStar(program.id)}
            onClick={() => onProgramClick(program.id)}
            isLast={index === programs.length - 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// PROGRAM LIST ITEM
// ============================================

interface ProgramListItemProps {
  program: Program;
  onToggleStar: () => void;
  onClick: () => void;
  isLast: boolean;
}

function ProgramListItem({ program, onToggleStar, onClick, isLast }: ProgramListItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TooltipProvider>
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "flex items-center gap-6 p-6 cursor-pointer transition-colors duration-150",
          isHovered && "bg-muted/50",
          !isLast && "border-b border-border"
        )}
      >
        {/* PROGRAM INFO */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground">
              {program.name}
            </h4>
            {program.isDefault && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground truncate">
            {program.key} • {program.description}
          </p>
        </div>

        {/* METADATA */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-xs text-muted-foreground text-right">
            <div>{program.projectCount} projects</div>
            <div>{program.epicCount} epics</div>
          </div>

          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-6 w-6">
                <AvatarImage src={program.lead.avatar} alt={program.lead.name} />
                <AvatarFallback className="text-xs">
                  {program.lead.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{program.lead.name}</TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleStar();
            }}
          >
            <Star 
              className={cn(
                "h-4 w-4",
                program.isStarred 
                  ? "fill-amber-400 text-amber-400" 
                  : "text-muted-foreground"
              )}
            />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
