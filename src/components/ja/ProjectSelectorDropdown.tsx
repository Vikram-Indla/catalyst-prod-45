import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/glyph/search';
import AddIcon from '@atlaskit/icon/glyph/add';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import BoardIcon from '@atlaskit/icon/glyph/board';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { supabase } from '@/integrations/supabase/client';
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

  return (
    <div style={{
      width: '320px',
      background: token('elevation.surface.overlay', '#FFFFFF'),
      borderRadius: token('border.radius', '3px'),
      boxShadow: token('elevation.shadow.overlay', '0 4px 8px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
      overflow: 'hidden',
    }}>
      {/* HEADER - ATLASKIT SPEC */}
      <div style={{
        padding: `${token('space.150', '12px')} ${token('space.200', '16px')}`,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        <h3 style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: token('color.text.subtlest', '#6B778C'),
          margin: 0,
        }}>
          PROJECTS
        </h3>
      </div>

      {/* FILTER CHIP (if program selected) */}
      {programId && programName && (
        <div style={{
          padding: `${token('space.100', '8px')} ${token('space.200', '16px')}`,
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          background: token('color.background.neutral', '#F4F5F7'),
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: token('space.050', '4px'),
            padding: `${token('space.050', '4px')} ${token('space.100', '8px')}`,
            background: token('color.background.neutral.hovered', '#EBECF0'),
            borderRadius: token('border.radius', '3px'),
            fontSize: '12px',
            color: token('color.text', '#172B4D'),
          }}>
            <span style={{ fontWeight: 500, color: token('color.text.subtlest', '#6B778C') }}>Filtered by:</span>
            <span style={{ fontWeight: 500 }}>{programName}</span>
            <button
              onClick={handleClearFilter}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                marginLeft: token('space.050', '4px'),
              }}
            >
              <CrossIcon label="Clear" size="small" primaryColor={token('color.icon.subtle', '#6B778C')} />
            </button>
          </div>
        </div>
      )}

      {/* SEARCH - ATLASKIT TEXTFIELD */}
      <div style={{
        padding: token('space.150', '12px'),
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        <Textfield
          placeholder="Search projects..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          elemBeforeInput={
            <div style={{ paddingLeft: token('space.100', '8px'), display: 'flex', alignItems: 'center' }}>
              <SearchIcon label="" size="small" primaryColor={token('color.icon.subtle', '#6B778C')} />
            </div>
          }
        />
      </div>

      {/* PROJECTS LIST */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
      }}>
        {isLoading ? (
          <div style={{
            padding: token('space.300', '24px'),
            textAlign: 'center',
            fontSize: '14px',
            color: token('color.text.subtlest', '#6B778C'),
          }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: token('space.300', '24px'),
            textAlign: 'center',
            fontSize: '14px',
            color: token('color.text.subtlest', '#6B778C'),
          }}>
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

      {/* FOOTER - ATLASKIT SPEC */}
      <div style={{
        borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        <DropdownActionButton onClick={handleCreateClick}>
          <AddIcon label="" size="small" primaryColor={token('color.icon.subtle', '#6B778C')} />
          Create Project
        </DropdownActionButton>
        
        <DropdownActionButton onClick={handleManageClick}>
          <SettingsIcon label="" size="small" primaryColor={token('color.icon.subtle', '#6B778C')} />
          Manage Projects
        </DropdownActionButton>
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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100', '8px'),
        padding: `${token('space.100', '8px')} ${token('space.200', '16px')}`,
        transition: 'background 150ms',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      onClick={handleClick}
    >
      <BoardIcon
        label=""
        size="medium"
        primaryColor={token('color.icon.subtle', '#6B778C')}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 400,
          color: token('color.text', '#172B4D'),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
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
      <button
        onClick={handleStarClick}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: token('space.050', '4px'),
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {isStarred ? (
          <StarFilledIcon label="Unstar" size="small" primaryColor={token('color.icon.warning', '#FF991F')} />
        ) : (
          <StarIcon label="Star" size="small" primaryColor={token('color.icon.subtle', '#6B778C')} />
        )}
      </button>
    </div>
  );
});

// Action button component - ATLASKIT SPEC
interface DropdownActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

const DropdownActionButton = React.memo(function DropdownActionButton({ 
  onClick, 
  children 
}: DropdownActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100', '8px'),
        width: '100%',
        padding: `${token('space.100', '8px')} ${token('space.200', '16px')}`,
        fontSize: '14px',
        fontWeight: 400,
        color: token('color.text', '#172B4D'),
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
});
