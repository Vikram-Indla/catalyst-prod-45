import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Content, Main, PageLayout } from '@atlaskit/page-layout';
import DynamicTable from '@atlaskit/dynamic-table';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Lozenge from '@atlaskit/lozenge';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import SearchIcon from '@atlaskit/icon/glyph/search';
import AddIcon from '@atlaskit/icon/glyph/add';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';

interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  programKey: string;
  programName: string;
  programId: string;
  type: string;
  category: string;
  lead: {
    name: string;
    avatar?: string;
  };
  icon: string;
  iconBg: string;
  isStarred: boolean;
}

export default function ProjectDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [starredProjects, setStarredProjects] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState<any>(null);

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

  const iconColors = ['#4C9AFF', '#FF5630', '#00B8D9', '#FFC400', '#36B37E', '#6554C0'];
  const icons = ['🧭', '💼', '🏢', '🔧', '📊', '📱', '⚙️', '🚀'];

  // Transform data to Project interface
  const projects: Project[] = (projectsData || []).map((p, index) => ({
    id: p.id,
    key: p.name.substring(0, 4).toUpperCase(),
    name: p.name,
    description: 'No description provided',
    programKey: p.portfolios?.name?.substring(0, 4).toUpperCase() || 'DEF',
    programName: p.portfolios?.name || 'Default',
    programId: p.portfolio_id || '',
    type: 'Company-managed software',
    category: 'Software',
    lead: {
      name: 'Unassigned',
      avatar: undefined,
    },
    icon: icons[index % icons.length],
    iconBg: iconColors[index % iconColors.length],
    isStarred: starredProjects.has(p.id),
  }));

  const filteredProjects = projects.filter(proj =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.programName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Create table head
  const head = {
    cells: [
      {
        key: 'star',
        content: '',
        isSortable: false,
        width: 4,
      },
      {
        key: 'name',
        content: 'Name',
        isSortable: true,
        width: 22,
      },
      {
        key: 'key',
        content: 'Key',
        isSortable: true,
        width: 8,
      },
      {
        key: 'type',
        content: 'Type',
        isSortable: true,
        width: 18,
      },
      {
        key: 'program',
        content: 'Program',
        isSortable: true,
        width: 15,
      },
      {
        key: 'lead',
        content: 'Lead',
        isSortable: true,
        width: 15,
      },
      {
        key: 'category',
        content: 'Category',
        isSortable: true,
        width: 12,
      },
      {
        key: 'actions',
        content: '',
        isSortable: false,
        width: 6,
      },
    ],
  };

  // Create table rows
  const rows = filteredProjects.map((project) => ({
    key: project.id,
    onClick: () => handleProjectClick(project.id),
    cells: [
      {
        key: 'star',
        content: (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(project.id);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {project.isStarred ? (
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
            )}
          </button>
        ),
      },
      {
        key: 'name',
        content: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              background: project.iconBg,
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
            }}>
              {project.icon}
            </div>
            <span style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#0052CC',
            }}>
              {project.name}
            </span>
          </div>
        ),
      },
      {
        key: 'key',
        content: (
          <span style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#172B4D',
          }}>
            {project.key}
          </span>
        ),
      },
      {
        key: 'type',
        content: (
          <span style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#5E6C84',
          }}>
            {project.type}
          </span>
        ),
      },
      {
        key: 'program',
        content: (
          <a
            href={`/programs/${project.programId}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <span style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#0052CC',
            }}>
              {project.programName}
            </span>
            {project.programKey === 'DEF' && (
              <Lozenge appearance="default">Default</Lozenge>
            )}
          </a>
        ),
      },
      {
        key: 'lead',
        content: (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Avatar
              size="xsmall"
              src={project.lead.avatar}
              name={project.lead.name}
            />
            <span style={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#172B4D',
            }}>
              {project.lead.name}
            </span>
          </div>
        ),
      },
      {
        key: 'category',
        content: (
          <span style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#5E6C84',
          }}>
            {project.category}
          </span>
        ),
      },
      {
        key: 'actions',
        content: (
          <DropdownMenu
            trigger={({ triggerRef, ...props }) => (
              <button
                {...props}
                ref={triggerRef as React.Ref<HTMLButtonElement>}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <MoreIcon label="More" size="small" />
              </button>
            )}
          >
            <DropdownItemGroup>
              <DropdownItem onClick={() => handleProjectClick(project.id)}>View project</DropdownItem>
              <DropdownItem>Project settings</DropdownItem>
              <DropdownItem>Copy URL</DropdownItem>
              <DropdownItem>Archive</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        ),
      },
    ],
  }));

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
            padding: '24px 40px',
            background: '#FFFFFF',
            minHeight: '100vh',
          }}>
            {/* PAGE HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <div>
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: 500,
                  lineHeight: '28px',
                  color: '#172B4D',
                  margin: 0,
                }}>
                  Projects
                </h1>
              </div>

              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                <Button
                  appearance="primary"
                  iconBefore={<AddIcon label="Create" size="small" />}
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create project
                </Button>
                <Button appearance="default">
                  Templates
                </Button>
              </div>
            </div>

            {/* FILTERS BAR */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <Textfield
                placeholder="Search projects"
                elemBeforeInput={
                  <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                    <SearchIcon label="Search" size="small" primaryColor="#6B778C" />
                  </div>
                }
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                width={280}
              />

              <Select
                inputId="filter-category"
                placeholder="All categories"
                options={[
                  { label: 'All categories', value: 'all' },
                  { label: 'Company-managed software', value: 'company-software' },
                  { label: 'Team-managed business', value: 'team-business' },
                ]}
                value={filterCategory}
                onChange={setFilterCategory}
                styles={{
                  container: (base: any) => ({ ...base, width: 200 }),
                }}
              />
            </div>

            {/* TABLE */}
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
              <DynamicTable
                head={head}
                rows={rows}
                rowsPerPage={20}
                defaultPage={1}
                isFixedSize
                defaultSortKey="name"
                defaultSortOrder="ASC"
              />
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
