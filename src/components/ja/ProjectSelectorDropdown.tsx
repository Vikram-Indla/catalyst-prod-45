import { useState } from 'react';
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

export function ProjectSelectorDropdown({ onClose, onCreateClick }: ProjectSelectorDropdownProps) {
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

  const handleSelect = (project: typeof filtered[0]) => {
    setProjectId(project.id);
    setProjectName(project.name);
    
    if (project.portfolio_id && project.portfolios) {
      setProgramId(project.portfolio_id);
      setProgramName(project.portfolios.name);
    }
    
    navigate(getProjectLandingRoute(project.id));
    onClose();
  };

  const handleToggleStar = async (e: React.MouseEvent, project: typeof filtered[0]) => {
    e.stopPropagation();
    await toggleStar({
      room_type: 'program',
      room_id: project.id,
      room_name: project.name,
      room_subtitle: project.portfolios?.name || 'Project',
      room_path: getProjectLandingRoute(project.id),
      pi_label: null,
    });
  };

  const handleCreateClick = () => {
    onClose();
    onCreateClick?.();
  };

  const handleManageClick = () => {
    navigate('/admin/programs');
    onClose();
  };

  const handleClearFilter = () => {
    setProgramId(null);
    setProgramName(null);
  };

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
            onChange={(e) => setSearch(e.target.value)}
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
          filtered.map((project) => {
            const starred = isStarred('program', project.id);
            return (
              <button
                key={project.id}
                onClick={() => handleSelect(project)}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
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
                  onClick={(e) => handleToggleStar(e, project)}
                  style={{
                    width: '16px',
                    height: '16px',
                    color: starred ? '#C69C6D' : token('color.icon', '#6B778C'),
                    fill: starred ? '#C69C6D' : 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, padding: '8px' }}>
        <button
          onClick={handleCreateClick}
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
            fontWeight: 500,
            color: '#C69C6D',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          Create Project
        </button>
        
        <button
          onClick={handleManageClick}
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
            color: token('color.text.subtlest', '#6B778C'),
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Settings style={{ width: '16px', height: '16px' }} />
          Manage Projects
        </button>
      </div>
    </div>
  );
}
