import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { Search, Building2, Plus, Settings } from 'lucide-react';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProgramLandingRoute } from '@/lib/workspaceContext';

interface ProgramSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export function ProgramSelectorDropdown({ onClose, onCreateClick }: ProgramSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs-header'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (programs || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (programId: string, programName: string) => {
    setProgramId(programId);
    setProgramName(programName);
    setProjectId(null);
    setProjectName(null);
    navigate(getProgramLandingRoute(programId));
    onClose();
  };

  const handleCreateClick = () => {
    onClose();
    onCreateClick?.();
  };

  const handleManageClick = () => {
    navigate('/admin/portfolios');
    onClose();
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
          PROGRAMS
        </p>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search programs..."
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
            {search ? 'No programs found' : 'No programs available'}
          </div>
        ) : (
          filtered.map((program) => (
            <button
              key={program.id}
              onClick={() => handleSelect(program.id, program.name)}
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
              <Building2 style={{
                width: '16px',
                height: '16px',
                color: token('color.icon', '#6B778C'),
                flexShrink: 0,
              }} />
              <span style={{ flex: 1 }}>{program.name}</span>
            </button>
          ))
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
          Create Program
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
          Manage Programs
        </button>
      </div>
    </div>
  );
}
