import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { token } from '@atlaskit/tokens';
import { Content, Main, PageLayout } from '@atlaskit/page-layout';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import ButtonGroup from '@atlaskit/button-group';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import Textfield from '@atlaskit/textfield';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import SearchIcon from '@atlaskit/icon/glyph/search';
import GridIcon from '@atlaskit/icon/glyph/media-services/grid';
import ListIcon from '@atlaskit/icon/glyph/list';
import AddIcon from '@atlaskit/icon/glyph/add';
import { CreateProgramDialog } from '@/components/programs/CreateProgramDialog';

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
      <PageLayout>
        <Content>
          <Main>
            <div style={{ padding: '32px' }}>
              <EmptyState
                header="Error loading programs"
                description="There was an error loading the program directory. Please try again."
              />
            </div>
          </Main>
        </Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Content>
        <Main>
          <div style={{
            padding: '32px',
            background: '#FAFBFC',
            minHeight: '100vh',
          }}>
            {/* PAGE HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px',
            }}>
              <div>
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: 500,
                  color: '#172B4D',
                  margin: 0,
                  marginBottom: '4px',
                }}>
                  Programs
                </h1>
                <p style={{
                  fontSize: '14px',
                  color: '#6B778C',
                  margin: 0,
                }}>
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

            {/* CONTROLS BAR */}
            <div style={{
              background: '#FFFFFF',
              padding: '16px',
              borderRadius: '3px',
              marginBottom: '24px',
              boxShadow: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}>
              {/* Search */}
              <div style={{ width: '320px' }}>
                <Textfield
                  placeholder="Search programs..."
                  elemBeforeInput={
                    <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                      <SearchIcon label="Search" size="small" primaryColor="#6B778C" />
                    </div>
                  }
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* View Toggle */}
              <ButtonGroup>
                <Button
                  isSelected={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                  iconBefore={<GridIcon label="Grid view" size="small" />}
                >
                  Grid
                </Button>
                <Button
                  isSelected={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                  iconBefore={<ListIcon label="List view" size="small" />}
                >
                  List
                </Button>
              </ButtonGroup>
            </div>

            {/* CONTENT */}
            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '200px',
              }}>
                <Spinner size="large" />
              </div>
            ) : filteredPrograms.length === 0 ? (
              <EmptyState
                header="No programs found"
                description={searchQuery ? 'Try adjusting your search query' : 'Create your first program to get started'}
                primaryAction={
                  <Button 
                    appearance="primary"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    Create program
                  </Button>
                }
                secondaryAction={
                  searchQuery ? (
                    <Button 
                      appearance="subtle"
                      onClick={() => setSearchQuery('')}
                    >
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
          </div>
        </Main>
      </Content>

      {/* CREATE PROGRAM DIALOG */}
      <CreateProgramDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </PageLayout>
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '24px',
    }}>
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
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: '3px',
        padding: '24px',
        boxShadow: isHovered 
          ? '0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'
          : '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
        border: '1px solid #DFE1E6',
        transition: 'box-shadow 150ms, transform 150ms',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* STAR BUTTON */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        opacity: isHovered || program.isStarred ? 1 : 0,
        transition: 'opacity 150ms',
      }}>
        <Tooltip content={program.isStarred ? 'Unstar' : 'Star'}>
          <Button
            appearance="subtle"
            iconBefore={
              program.isStarred ? (
                <StarFilledIcon 
                  label="Starred" 
                  size="small" 
                  primaryColor="#FFAB00"
                />
              ) : (
                <StarIcon 
                  label="Star" 
                  size="small" 
                  primaryColor="#6B778C"
                />
              )
            }
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleStar();
            }}
          />
        </Tooltip>
      </div>

      {/* PROGRAM INFO */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#172B4D',
            margin: 0,
          }}>
            {program.name}
          </h3>
          {program.isDefault && (
            <Lozenge appearance="default">Default</Lozenge>
          )}
        </div>
        
        <p style={{
          fontSize: '12px',
          color: '#6B778C',
          margin: 0,
          marginBottom: '4px',
        }}>
          {program.key}
        </p>

        <p style={{
          fontSize: '14px',
          color: '#6B778C',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '20px',
          minHeight: '40px',
        }}>
          {program.description}
        </p>
      </div>

      {/* METADATA */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '16px',
        borderTop: '1px solid #DFE1E6',
      }}>
        <div style={{
          display: 'flex',
          gap: '16px',
          fontSize: '12px',
          color: '#6B778C',
        }}>
          <span>{program.projectCount} project{program.projectCount !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{program.epicCount} epic{program.epicCount !== 1 ? 's' : ''}</span>
        </div>

        <Tooltip content={program.lead.name}>
          <Avatar
            size="small"
            src={program.lead.avatar}
            name={program.lead.name}
          />
        </Tooltip>
      </div>
    </div>
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
    <div style={{
      background: '#FFFFFF',
      borderRadius: '3px',
      boxShadow: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
      overflow: 'hidden',
    }}>
      {programs.map((program, index) => (
        <ProgramListItem
          key={program.id}
          program={program}
          onToggleStar={() => onToggleStar(program.id)}
          onClick={() => onProgramClick(program.id)}
          isLast={index === programs.length - 1}
        />
      ))}
    </div>
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '24px',
        background: isHovered ? '#F4F5F7' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid #DFE1E6',
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
    >
      {/* PROGRAM INFO */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#172B4D',
            margin: 0,
          }}>
            {program.name}
          </h4>
          {program.isDefault && (
            <Lozenge appearance="default">Default</Lozenge>
          )}
        </div>
        
        <p style={{
          fontSize: '12px',
          color: '#6B778C',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {program.key} • {program.description}
        </p>
      </div>

      {/* METADATA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6B778C',
          textAlign: 'right',
        }}>
          <div>{program.projectCount} projects</div>
          <div>{program.epicCount} epics</div>
        </div>

        <Tooltip content={program.lead.name}>
          <Avatar
            size="small"
            src={program.lead.avatar}
            name={program.lead.name}
          />
        </Tooltip>

        <Button
          appearance="subtle"
          iconBefore={
            program.isStarred ? (
              <StarFilledIcon 
                label="Starred" 
                size="small" 
                primaryColor="#FFAB00"
              />
            ) : (
              <StarIcon 
                label="Star" 
                size="small" 
                primaryColor="#6B778C"
              />
            )
          }
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleStar();
          }}
        />
      </div>
    </div>
  );
}
