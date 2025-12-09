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
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';

interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  programKey: string;
  programName: string;
  programId: string;
  type: 'scrum' | 'kanban';
  lead: {
    name: string;
    avatar?: string;
  };
  issueCount: number;
  isStarred: boolean;
  updatedAt: Date;
}

interface ProjectGroup {
  programKey: string;
  programName: string;
  programId: string;
  projects: Project[];
}

export default function ProjectDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [starredProjects, setStarredProjects] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch projects from programs table (Projects in UI = programs in DB)
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

  // Transform data to Project interface
  const projects: Project[] = (projectsData || []).map(p => ({
    id: p.id,
    key: p.name.substring(0, 4).toUpperCase(),
    name: p.name,
    description: 'No description provided',
    programKey: p.portfolios?.name?.substring(0, 4).toUpperCase() || 'DEF',
    programName: p.portfolios?.name || 'Default',
    programId: p.portfolio_id || '',
    type: 'scrum' as const,
    lead: {
      name: 'Unassigned',
      avatar: undefined,
    },
    issueCount: 0,
    isStarred: starredProjects.has(p.id),
    updatedAt: new Date(p.updated_at || p.created_at),
  }));

  const filteredProjects = projects.filter(proj =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.programName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group projects by program
  const projectsByProgram = filteredProjects.reduce((acc, project) => {
    const programKey = project.programKey;
    if (!acc[programKey]) {
      acc[programKey] = {
        programKey,
        programName: project.programName,
        programId: project.programId,
        projects: [],
      };
    }
    acc[programKey].projects.push(project);
    return acc;
  }, {} as Record<string, ProjectGroup>);

  const toggleStar = (projectId: string) => {
    setStarredProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}/room`);
  };

  if (error) {
    return (
      <PageLayout>
        <Content>
          <Main>
            <div style={{ padding: '32px' }}>
              <EmptyState
                header="Error loading projects"
                description="There was an error loading the project directory. Please try again."
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
                  Projects
                </h1>
                <p style={{
                  fontSize: '14px',
                  color: '#6B778C',
                  margin: 0,
                }}>
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                </p>
              </div>

              <Button
                appearance="primary"
                iconBefore={<AddIcon label="Create" size="small" />}
                onClick={() => setShowCreateDialog(true)}
              >
                Create project
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
              <div style={{ width: '400px' }}>
                <Textfield
                  placeholder="Search projects..."
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

            {/* CONTENT - GROUPED BY PROGRAM */}
            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '200px',
              }}>
                <Spinner size="large" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <EmptyState
                header="No projects found"
                description={searchQuery ? 'Try adjusting your search query' : 'Create your first project to get started'}
                primaryAction={
                  <Button 
                    appearance="primary"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    Create project
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
            ) : (
              Object.values(projectsByProgram).map((group) => (
                <div key={group.programKey} style={{ marginBottom: '48px' }}>
                  {/* PROGRAM HEADER */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    <h2 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#172B4D',
                      margin: 0,
                    }}>
                      {group.programName}
                    </h2>
                    <span style={{
                      fontSize: '12px',
                      color: '#6B778C',
                    }}>
                      {group.projects.length} project{group.projects.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* PROJECTS */}
                  {viewMode === 'grid' ? (
                    <ProjectGrid 
                      projects={group.projects}
                      onToggleStar={toggleStar}
                      onProjectClick={handleProjectClick}
                    />
                  ) : (
                    <ProjectList 
                      projects={group.projects}
                      onToggleStar={toggleStar}
                      onProjectClick={handleProjectClick}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </Main>
      </Content>

      {/* CREATE PROJECT DIALOG */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </PageLayout>
  );
}

// ============================================
// PROJECT GRID VIEW
// ============================================

interface ProjectGridProps {
  projects: Project[];
  onToggleStar: (id: string) => void;
  onProjectClick: (id: string) => void;
}

function ProjectGrid({ projects, onToggleStar, onProjectClick }: ProjectGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '24px',
    }}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onToggleStar={() => onToggleStar(project.id)}
          onClick={() => onProjectClick(project.id)}
        />
      ))}
    </div>
  );
}

// ============================================
// PROJECT CARD COMPONENT
// ============================================

interface ProjectCardProps {
  project: Project;
  onToggleStar: () => void;
  onClick: () => void;
}

function ProjectCard({ project, onToggleStar, onClick }: ProjectCardProps) {
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
        opacity: isHovered || project.isStarred ? 1 : 0,
        transition: 'opacity 150ms',
      }}>
        <Tooltip content={project.isStarred ? 'Unstar' : 'Star'}>
          <Button
            appearance="subtle"
            iconBefore={
              project.isStarred ? (
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

      {/* PROJECT INFO */}
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
            {project.name}
          </h3>
          <Lozenge appearance={project.type === 'scrum' ? 'inprogress' : 'default'}>
            {project.type}
          </Lozenge>
        </div>
        
        <p style={{
          fontSize: '12px',
          color: '#6B778C',
          margin: 0,
          marginBottom: '4px',
        }}>
          {project.key}
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
          {project.description}
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
          fontSize: '12px',
          color: '#6B778C',
        }}>
          {project.issueCount} issue{project.issueCount !== 1 ? 's' : ''}
        </div>

        <Tooltip content={project.lead.name}>
          <Avatar
            size="small"
            src={project.lead.avatar}
            name={project.lead.name}
          />
        </Tooltip>
      </div>
    </div>
  );
}

// ============================================
// PROJECT LIST VIEW
// ============================================

interface ProjectListProps {
  projects: Project[];
  onToggleStar: (id: string) => void;
  onProjectClick: (id: string) => void;
}

function ProjectList({ projects, onToggleStar, onProjectClick }: ProjectListProps) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '3px',
      boxShadow: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
      overflow: 'hidden',
    }}>
      {projects.map((project, index) => (
        <ProjectListItem
          key={project.id}
          project={project}
          onToggleStar={() => onToggleStar(project.id)}
          onClick={() => onProjectClick(project.id)}
          isLast={index === projects.length - 1}
        />
      ))}
    </div>
  );
}

// ============================================
// PROJECT LIST ITEM
// ============================================

interface ProjectListItemProps {
  project: Project;
  onToggleStar: () => void;
  onClick: () => void;
  isLast: boolean;
}

function ProjectListItem({ project, onToggleStar, onClick, isLast }: ProjectListItemProps) {
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
      {/* PROJECT INFO */}
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
            {project.name}
          </h4>
          <Lozenge appearance={project.type === 'scrum' ? 'inprogress' : 'default'}>
            {project.type}
          </Lozenge>
        </div>
        
        <p style={{
          fontSize: '12px',
          color: '#6B778C',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {project.key} • {project.description}
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
        }}>
          {project.issueCount} issues
        </div>

        <Tooltip content={project.lead.name}>
          <Avatar
            size="small"
            src={project.lead.avatar}
            name={project.lead.name}
          />
        </Tooltip>

        <Button
          appearance="subtle"
          iconBefore={
            project.isStarred ? (
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
