import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { Search, Layers, Star, Plus, Settings, X } from 'lucide-react';
import { useStarredItems } from '@/hooks/useStarredItems';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProjectLandingRoute } from '@/lib/workspaceContext';

interface ProjectSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export const ProjectSelectorDropdown = React.memo(function ProjectSelectorDropdown({ 
  onClose, 
  onCreateClick 
}: ProjectSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { isStarred, toggleStar } = useStarredItems();
  const { programId, programName, setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects-header', programId],
    queryFn: async () => {
      let query = supabase
        .from('programs')
        .select(`
          id,
          name,
          portfolio_id,
          portfolios (
            id,
            name
          )
        `)
        .order('name');
      
      if (programId) {
        query = query.eq('portfolio_id', programId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (projects || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback((project: typeof filtered[0]) => {
    setProjectId(project.id);
    setProjectName(project.name);
    
    if (project.portfolio_id && project.portfolios) {
      setProgramId(project.portfolio_id);
      setProgramName(project.portfolios.name);
    }
    
    navigate(getProjectLandingRoute(project.id));
    onClose();
  }, [navigate, onClose, setProgramId, setProgramName, setProjectId, setProjectName]);

  const handleToggleStar = useCallback(async (e: React.MouseEvent, project: typeof filtered[0]) => {
    e.stopPropagation();
    await toggleStar({
      room_type: 'program',
      room_id: project.id,
      room_name: project.name,
      room_subtitle: project.portfolios?.name || 'Project',
      room_path: getProjectLandingRoute(project.id),
      pi_label: null,
    });
  }, [toggleStar]);

  const handleCreateClick = useCallback(() => {
    onClose();
    onCreateClick?.();
  }, [onClose, onCreateClick]);

  const handleManageClick = useCallback(() => {
    navigate('/admin/programs');
    onClose();
  }, [navigate, onClose]);

  const handleClearFilter = useCallback(() => {
    setProgramId(null);
    setProgramName(null);
  }, [setProgramId, setProgramName]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  return (
    <div style={{
      width: '280px',
      background: token('elevation.surface', '#FFFFFF'),
      borderRadius: '3px',
      boxShadow: '0 4px 8px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          color: token('color.text.subtlest', '#6B778C'),
          margin: '0 0 8px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          PROJECTS
        </p>
        
        {/* Filter indicator */}
        {programId && programName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            background: token('color.background.neutral', '#F4F5F7'),
            borderRadius: '3px',
            marginBottom: '8px',
            fontSize: '12px',
          }}>
            <span style={{ color: token('color.text.subtlest', '#6B778C') }}>Filtered by:</span>
            <span style={{ fontWeight: 500, color: token('color.text', '#172B4D') }}>{programName}</span>
            <button
              onClick={handleClearFilter}
              style={{
                marginLeft: 'auto',
                padding: '2px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X style={{ width: '12px', height: '12px', color: token('color.icon', '#6B778C') }} />
            </button>
          </div>
        )}
        
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              height: '32px',
              padding: '6px 32px 6px 8px',
              fontSize: '14px',
              border: `2px solid ${token('color.border.input', '#DFE1E6')}`,
              borderRadius: '3px',
              outline: 'none',
              background: token('elevation.surface', '#FFFFFF'),
              color: token('color.text', '#172B4D'),
              boxSizing: 'border-box',
            }}
          />
          <Search style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            color: token('color.icon', '#6B778C'),
          }} />
        </div>
      </div>

      {/* List */}
      <div style={{
        maxHeight: '200px',
        overflowY: 'auto',
        padding: '8px',
      }}>
        {isLoading ? (
          <div style={{ padding: '16px', textAlign: 'center', color: token('color.text.subtlest', '#6B778C'), fontSize: '14px' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: token('color.text.subtlest', '#6B778C'), fontSize: '14px' }}>
            {search ? 'No projects found' : programId ? 'No projects in this program' : 'No projects available'}
          </div>
        ) : (
          filtered.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              isStarred={isStarred('program', project.id)}
              onSelect={handleSelect}
              onToggleStar={handleToggleStar}
            />
          ))
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, padding: '8px' }}>
        <ActionButton onClick={handleCreateClick} icon={<Plus style={{ width: '16px', height: '16px' }} />} isPrimary>
          Create Project
        </ActionButton>
        
        <ActionButton onClick={handleManageClick} icon={<Settings style={{ width: '16px', height: '16px' }} />}>
          Manage Projects
        </ActionButton>
      </div>
    </div>
  );
});

// Memoized list item component
interface ProjectListItemProps {
  project: {
    id: string;
    name: string;
    portfolio_id: string | null;
    portfolios: { id: string; name: string } | null;
  };
  isStarred: boolean;
  onSelect: (project: any) => void;
  onToggleStar: (e: React.MouseEvent, project: any) => void;
}

const ProjectListItem = React.memo(function ProjectListItem({ 
  project, 
  isStarred, 
  onSelect, 
  onToggleStar 
}: ProjectListItemProps) {
  const handleClick = useCallback(() => {
    onSelect(project);
  }, [project, onSelect]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    onToggleStar(e, project);
  }, [project, onToggleStar]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
  }, []);

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        borderRadius: '3px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: token('color.text', '#172B4D'),
      }}
    >
      <Layers style={{
        width: '16px',
        height: '16px',
        color: token('color.icon', '#6B778C'),
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </div>
        {project.portfolios && (
          <div style={{
            fontSize: '12px',
            color: token('color.text.subtlest', '#6B778C'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {project.portfolios.name}
          </div>
        )}
      </div>
      <Star
        onClick={handleStarClick}
        style={{
          width: '16px',
          height: '16px',
          color: isStarred ? '#C69C6D' : token('color.icon', '#6B778C'),
          fill: isStarred ? '#C69C6D' : 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
    </button>
  );
});

// Action button component
interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  isPrimary?: boolean;
}

const ActionButton = React.memo(function ActionButton({ onClick, icon, children, isPrimary }: ActionButtonProps) {
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
  }, []);

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        borderRadius: '3px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: isPrimary ? 500 : 400,
        color: isPrimary ? '#C69C6D' : token('color.text.subtlest', '#6B778C'),
      }}
    >
      {icon}
      {children}
    </button>
  );
});
