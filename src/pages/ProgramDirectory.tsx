import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import Textfield from '@atlaskit/textfield';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import SearchIcon from '@atlaskit/icon/glyph/search';
import GridIcon from '@atlaskit/icon/glyph/board';
import ListIcon from '@atlaskit/icon/glyph/bullet-list';
import AddIcon from '@atlaskit/icon/glyph/add';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import { CreateProgramDialog } from '@/components/programs/CreateProgramDialog';

interface Program {
  id: string;
  name: string;
  status: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  projects_count?: number;
  epics_count?: number;
}

type ViewMode = 'grid' | 'list';

export default function ProgramDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [starredPrograms, setStarredPrograms] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch programs from portfolios table (Programs in UI = portfolios in DB)
  const { data: programs, isLoading, error } = useQuery({
    queryKey: ['programs-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Get counts for each program
      const programsWithCounts = await Promise.all(
        (data || []).map(async (program) => {
          // Count projects (programs table with portfolio_id)
          const { count: projectsCount } = await supabase
            .from('programs')
            .select('*', { count: 'exact', head: true })
            .eq('portfolio_id', program.id);

          // Count epics
          const { count: epicsCount } = await supabase
            .from('epics')
            .select('*', { count: 'exact', head: true })
            .eq('portfolio_id', program.id);

          return {
            ...program,
            projects_count: projectsCount || 0,
            epics_count: epicsCount || 0,
          };
        })
      );

      return programsWithCounts as Program[];
    },
  });

  const filteredPrograms = programs?.filter((program) =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const toggleStar = (programId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  };

  const handleProgramClick = (programId: string) => {
    navigate(`/program/${programId}/room`);
  };

  const getStatusAppearance = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'archived':
        return 'removed';
      default:
        return 'default';
    }
  };

  if (error) {
    return (
      <div style={{ padding: token('space.400') }}>
        <EmptyState
          header="Error loading programs"
          description="There was an error loading the program directory. Please try again."
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: token('elevation.surface'),
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: `${token('space.400')} ${token('space.500')}`,
          borderBottom: `1px solid ${token('color.border')}`,
          background: token('elevation.surface'),
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: token('space.300'),
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: token('color.text'),
                margin: 0,
              }}
            >
              Programs
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: token('color.text.subtlest'),
                margin: 0,
                marginTop: token('space.050'),
              }}
            >
              {filteredPrograms.length} program{filteredPrograms.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Button
            appearance="primary"
            iconBefore={<AddIcon label="Create" size="small" />}
            onClick={() => setShowCreateDialog(true)}
          >
            Create program
          </Button>
        </div>

        {/* Search and View Controls */}
        <div
          style={{
            display: 'flex',
            gap: token('space.200'),
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <Textfield
              placeholder="Search programs..."
              elemBeforeInput={
                <div style={{ marginLeft: token('space.100'), display: 'flex' }}>
                  <SearchIcon label="Search" size="small" />
                </div>
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: token('space.050'),
              background: token('color.background.neutral'),
              borderRadius: token('border.radius'),
              padding: '2px',
            }}
          >
            <Tooltip content="Grid view">
              <Button
                appearance={viewMode === 'grid' ? 'primary' : 'subtle'}
                iconBefore={<GridIcon label="Grid" size="small" />}
                onClick={() => setViewMode('grid')}
                spacing="compact"
              />
            </Tooltip>
            <Tooltip content="List view">
              <Button
                appearance={viewMode === 'list' ? 'primary' : 'subtle'}
                iconBefore={<ListIcon label="List" size="small" />}
                onClick={() => setViewMode('list')}
                spacing="compact"
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: token('space.400') }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px',
            }}
          >
            <Spinner size="large" />
          </div>
        ) : filteredPrograms.length === 0 ? (
          <EmptyState
            header={searchQuery ? 'No programs found' : 'No programs yet'}
            description={
              searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first program to get started'
            }
            primaryAction={
              !searchQuery ? (
                <Button
                  appearance="primary"
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create program
                </Button>
              ) : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: token('space.300'),
            }}
          >
            {filteredPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                isStarred={starredPrograms.has(program.id)}
                onToggleStar={(e) => toggleStar(program.id, e)}
                onClick={() => handleProgramClick(program.id)}
                onSettingsClick={(e) => {
                  e.stopPropagation();
                  navigate(`/program/${program.id}/settings`);
                }}
              />
            ))}
          </div>
        ) : (
          <ProgramList
            programs={filteredPrograms}
            starredPrograms={starredPrograms}
            onToggleStar={toggleStar}
            onProgramClick={handleProgramClick}
          />
        )}
      </div>

      {/* Create Dialog */}
      <CreateProgramDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}

// ============================================
// PROGRAM CARD COMPONENT
// ============================================

interface ProgramCardProps {
  program: Program;
  isStarred: boolean;
  onToggleStar: (e: React.MouseEvent) => void;
  onClick: () => void;
  onSettingsClick: (e: React.MouseEvent) => void;
}

function ProgramCard({
  program,
  isStarred,
  onToggleStar,
  onClick,
  onSettingsClick,
}: ProgramCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: token('elevation.surface'),
        borderRadius: token('border.radius'),
        border: `1px solid ${token('color.border')}`,
        padding: token('space.300'),
        cursor: 'pointer',
        transition: 'box-shadow 150ms, transform 150ms',
        boxShadow: isHovered
          ? token('elevation.shadow.overlay')
          : token('elevation.shadow.raised'),
        transform: isHovered ? 'translateY(-2px)' : 'none',
        position: 'relative',
      }}
    >
      {/* Star and Settings */}
      <div
        style={{
          position: 'absolute',
          top: token('space.200'),
          right: token('space.200'),
          display: 'flex',
          gap: token('space.050'),
          opacity: isHovered || isStarred ? 1 : 0,
          transition: 'opacity 150ms',
        }}
      >
        <Tooltip content={isStarred ? 'Unstar' : 'Star'}>
          <Button
            appearance="subtle"
            spacing="compact"
            iconBefore={
              isStarred ? (
                <StarFilledIcon
                  label="Starred"
                  size="small"
                  primaryColor={token('color.icon.warning')}
                />
              ) : (
                <StarIcon label="Star" size="small" />
              )
            }
            onClick={onToggleStar}
          />
        </Tooltip>
        <Tooltip content="Settings">
          <Button
            appearance="subtle"
            spacing="compact"
            iconBefore={<SettingsIcon label="Settings" size="small" />}
            onClick={onSettingsClick}
          />
        </Tooltip>
      </div>

      {/* Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: token('border.radius'),
          background: token('color.background.brand.bold'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: token('space.200'),
        }}
      >
        <span style={{ fontSize: '24px', color: 'white' }}>
          {program.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Name and Status */}
      <div style={{ marginBottom: token('space.150') }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: token('color.text'),
            margin: 0,
            marginBottom: token('space.050'),
          }}
        >
          {program.name}
        </h3>
        <Lozenge appearance={getStatusAppearance(program.status)}>
          {program.status || 'Active'}
        </Lozenge>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: token('space.300'),
          fontSize: '13px',
          color: token('color.text.subtlest'),
        }}
      >
        <span>{program.projects_count || 0} projects</span>
        <span>{program.epics_count || 0} epics</span>
      </div>
    </div>
  );
}

function getStatusAppearance(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'success' as const;
    case 'inactive':
      return 'default' as const;
    case 'archived':
      return 'removed' as const;
    default:
      return 'default' as const;
  }
}

// ============================================
// PROGRAM LIST COMPONENT
// ============================================

interface ProgramListProps {
  programs: Program[];
  starredPrograms: Set<string>;
  onToggleStar: (programId: string, e: React.MouseEvent) => void;
  onProgramClick: (programId: string) => void;
}

function ProgramList({
  programs,
  starredPrograms,
  onToggleStar,
  onProgramClick,
}: ProgramListProps) {
  return (
    <div
      style={{
        background: token('elevation.surface'),
        borderRadius: token('border.radius'),
        border: `1px solid ${token('color.border')}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 120px 100px 100px 80px',
          gap: token('space.200'),
          padding: `${token('space.150')} ${token('space.200')}`,
          background: token('color.background.neutral'),
          borderBottom: `1px solid ${token('color.border')}`,
          fontSize: '12px',
          fontWeight: 600,
          color: token('color.text.subtlest'),
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <div></div>
        <div>Name</div>
        <div>Status</div>
        <div>Projects</div>
        <div>Epics</div>
        <div></div>
      </div>

      {/* Rows */}
      {programs.map((program) => (
        <ProgramListRow
          key={program.id}
          program={program}
          isStarred={starredPrograms.has(program.id)}
          onToggleStar={(e) => onToggleStar(program.id, e)}
          onClick={() => onProgramClick(program.id)}
        />
      ))}
    </div>
  );
}

interface ProgramListRowProps {
  program: Program;
  isStarred: boolean;
  onToggleStar: (e: React.MouseEvent) => void;
  onClick: () => void;
}

function ProgramListRow({
  program,
  isStarred,
  onToggleStar,
  onClick,
}: ProgramListRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 120px 100px 100px 80px',
        gap: token('space.200'),
        padding: `${token('space.200')} ${token('space.200')}`,
        borderBottom: `1px solid ${token('color.border')}`,
        background: isHovered
          ? token('color.background.neutral.hovered')
          : 'transparent',
        cursor: 'pointer',
        alignItems: 'center',
        transition: 'background 150ms',
      }}
    >
      {/* Avatar */}
      <div>
        <Avatar
          size="small"
          appearance="square"
          name={program.name}
          src={undefined}
        />
      </div>

      {/* Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100'),
        }}
      >
        <span
          style={{
            fontWeight: 500,
            color: token('color.text'),
          }}
        >
          {program.name}
        </span>
      </div>

      {/* Status */}
      <div>
        <Lozenge appearance={getStatusAppearance(program.status)}>
          {program.status || 'Active'}
        </Lozenge>
      </div>

      {/* Projects Count */}
      <div style={{ color: token('color.text.subtlest') }}>
        {program.projects_count || 0}
      </div>

      {/* Epics Count */}
      <div style={{ color: token('color.text.subtlest') }}>
        {program.epics_count || 0}
      </div>

      {/* Star */}
      <div style={{ opacity: isHovered || isStarred ? 1 : 0 }}>
        <Button
          appearance="subtle"
          spacing="compact"
          iconBefore={
            isStarred ? (
              <StarFilledIcon
                label="Starred"
                size="small"
                primaryColor={token('color.icon.warning')}
              />
            ) : (
              <StarIcon label="Star" size="small" />
            )
          }
          onClick={onToggleStar}
        />
      </div>
    </div>
  );
}
