import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, LayoutGrid, List, Star } from '@/lib/atlaskit-icons';
import { Button as UiButton } from '@/components/ui/button';
import { Avatar, Button, EmptyState, Lozenge, SectionMessage, Spinner, Textfield, Tooltip } from '@/components/ads';
import { Card, CardContent } from '@/components/ui/card';
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

  // Fetch programs (now 'programs' table, formerly portfolios)
  const { data: programsData, isLoading, error } = useQuery({
    queryKey: ['programs-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*, projects(id)')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Transform data to Program interface
  const programs: Program[] = (programsData || []).map((p: any) => ({
    id: p.id,
    key: p.name?.substring(0, 4).toUpperCase() || 'DFLT',
    name: p.name || 'Unnamed',
    description: 'No description provided',
    lead: {
      name: 'Unassigned',
      avatar: undefined,
    },
    projectCount: p.projects?.length || 0,
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
      <div style={{ background: 'var(--ds-surface)', minHeight: '100%', padding: 24 }}>
        <SectionMessage appearance="error" title="Error loading programs">
          <p>There was an error loading the program directory. Please try again.</p>
        </SectionMessage>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ds-surface)', minHeight: '100%', padding: 24 }}>
      {/* PAGE HEADER — hub-standard typography (ProjectPageHeader scale) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          {/* ads-scanner:ignore-next-line — 22px matches ProjectPageHeader's level-1 heading; no ADS token maps to this exact value */}
          <h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: 'var(--ds-text)', margin: 0 }}>
            Programs
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)' }}>
            {filteredPrograms.length} program{filteredPrograms.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Button appearance="primary" iconBefore={<Plus size={16} />} onClick={() => setShowCreateDialog(true)}>
          Create program
        </Button>
      </div>

      {/* CONTROLS BAR */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
          padding: 16, marginBottom: 24, background: 'var(--ds-surface-raised)',
          border: '1px solid var(--ds-border)', borderRadius: 8,
        }}
      >
        <div style={{ width: 320 }}>
          <Textfield
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            elemBeforeInput={
              <span style={{ display: 'inline-flex', paddingLeft: 8, color: 'var(--ds-icon-subtle)' }}>
                <Search size={16} />
              </span>
            }
            aria-label="Search programs"
          />
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            appearance={viewMode === 'grid' ? 'default' : 'subtle'}
            isSelected={viewMode === 'grid'}
            spacing="compact"
            iconBefore={<LayoutGrid size={16} />}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            appearance={viewMode === 'list' ? 'default' : 'subtle'}
            isSelected={viewMode === 'list'}
            spacing="compact"
            iconBefore={<List size={16} />}
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Spinner size="large" />
        </div>
      ) : filteredPrograms.length === 0 ? (
        <EmptyState
          header="No programs found"
          description={searchQuery ? 'Try adjusting your search query' : 'Create your first program to get started'}
          primaryAction={
            <Button appearance="primary" onClick={() => setShowCreateDialog(true)}>
              Create program
            </Button>
          }
          secondaryAction={
            searchQuery ? (
              <Button appearance="subtle" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            ) : undefined
          }
        />
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
          <Tooltip content={program.isStarred ? 'Unstar' : 'Star'}>
            <UiButton
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
            </UiButton>
          </Tooltip>
        </div>

        {/* PROGRAM INFO */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold text-foreground">
              {program.name}
            </h3>
            {program.isDefault && (
              <Lozenge appearance="default">Default</Lozenge>
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

          <Tooltip content={program.lead.name}>
            <Avatar src={program.lead.avatar} name={program.lead.name} size="xsmall" />
          </Tooltip>
        </div>
      </CardContent>
    </Card>
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
            <Lozenge appearance="default">Default</Lozenge>
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

        <Tooltip content={program.lead.name}>
          <Avatar src={program.lead.avatar} name={program.lead.name} size="xsmall" />
        </Tooltip>

        <UiButton
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
        </UiButton>
      </div>
    </div>
  );
}
