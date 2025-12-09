import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/glyph/search';
import AddIcon from '@atlaskit/icon/glyph/add';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProgramLandingRoute } from '@/lib/workspaceContext';

interface ProgramSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export const ProgramSelectorDropdown = React.memo(function ProgramSelectorDropdown({ 
  onClose, 
  onCreateClick 
}: ProgramSelectorDropdownProps) {
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

  const handleSelect = useCallback((programId: string, programName: string) => {
    setProgramId(programId);
    setProgramName(programName);
    setProjectId(null);
    setProjectName(null);
    navigate(getProgramLandingRoute(programId));
    onClose();
  }, [navigate, onClose, setProgramId, setProgramName, setProjectId, setProjectName]);

  const handleCreateClick = useCallback(() => {
    onClose();
    onCreateClick?.();
  }, [onClose, onCreateClick]);

  const handleManageClick = useCallback(() => {
    navigate('/admin/portfolios');
    onClose();
  }, [navigate, onClose]);

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
          PROGRAMS
        </h3>
      </div>

      {/* SEARCH - ATLASKIT TEXTFIELD */}
      <div style={{
        padding: token('space.150', '12px'),
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        <Textfield
          placeholder="Search programs..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          elemBeforeInput={
            <div style={{ paddingLeft: token('space.100', '8px'), display: 'flex', alignItems: 'center' }}>
              <SearchIcon label="" size="small" primaryColor={token('color.icon.subtle', '#6B778C')} />
            </div>
          }
        />
      </div>

      {/* PROGRAMS LIST */}
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
            {search ? 'No programs found' : 'No programs available'}
          </div>
        ) : (
          filtered.map((program) => (
            <ProgramListItem
              key={program.id}
              id={program.id}
              name={program.name}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* FOOTER - ATLASKIT SPEC */}
      <div style={{
        borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        <DropdownActionButton onClick={handleCreateClick} isPrimary>
          <AddIcon label="" size="small" primaryColor={token('color.icon.subtle', '#6B778C')} />
          Create Program
        </DropdownActionButton>
        
        <DropdownActionButton onClick={handleManageClick}>
          <SettingsIcon label="" size="small" primaryColor={token('color.icon.subtle', '#6B778C')} />
          Manage Programs
        </DropdownActionButton>
      </div>
    </div>
  );
});

// Memoized list item component
interface ProgramListItemProps {
  id: string;
  name: string;
  onSelect: (id: string, name: string) => void;
}

const ProgramListItem = React.memo(function ProgramListItem({ id, name, onSelect }: ProgramListItemProps) {
  const handleClick = useCallback(() => {
    onSelect(id, name);
  }, [id, name, onSelect]);

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100', '8px'),
        width: '100%',
        padding: `${token('space.100', '8px')} ${token('space.200', '16px')}`,
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
      <FolderIcon
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
          {name}
        </div>
      </div>
    </button>
  );
});

// Action button component - ATLASKIT SPEC
interface DropdownActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  isPrimary?: boolean;
}

const DropdownActionButton = React.memo(function DropdownActionButton({ 
  onClick, 
  children, 
  isPrimary 
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
