import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Search, ChevronDown, MoreHorizontal, MessageSquare } from 'lucide-react';
import { useReleaseVersions } from '../../hooks/useReleaseVersions';
import { ReleaseVersion } from '../../types';
import { format } from 'date-fns';

interface ReleasesTabProps {
  projectId: string;
  onCreateVersion: () => void;
  onVersionClick: (version: ReleaseVersion) => void;
}

export const ReleasesTab: React.FC<ReleasesTabProps> = ({ projectId, onCreateVersion, onVersionClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'UNRELEASED' | 'RELEASED' | undefined>('UNRELEASED');
  
  const { data: versions, isLoading } = useReleaseVersions(projectId, statusFilter);

  const filteredVersions = versions?.filter(v => 
    !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ 
      padding: token('space.300', '24px'),
      backgroundColor: token('elevation.surface', '#FFFFFF'),
      minHeight: '100%',
    }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: token('space.300', '24px'),
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
          {/* Search */}
          <div style={{ position: 'relative', width: 200 }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: 8, 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: token('color.icon.subtle', '#5E6C84'),
              }} 
            />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: `${token('space.075', '6px')} ${token('space.100', '8px')} ${token('space.075', '6px')} 32px`,
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: '3px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Status Filter */}
          <DropdownMenu
            trigger={({ triggerRef, ...props }) => (
              <button
                ref={triggerRef as any}
                {...props}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: token('space.050', '4px'),
                  padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
                  backgroundColor: token('color.background.neutral', '#F4F5F7'),
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: '3px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: token('color.text', '#172B4D'),
                }}
              >
                {statusFilter || 'All'}
                <ChevronDown size={16} />
              </button>
            )}
          >
            <DropdownItemGroup>
              <DropdownItem onClick={() => setStatusFilter(undefined)}>All</DropdownItem>
              <DropdownItem onClick={() => setStatusFilter('UNRELEASED')}>Unreleased</DropdownItem>
              <DropdownItem onClick={() => setStatusFilter('RELEASED')}>Released</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token('space.050', '4px'),
              padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              color: token('color.text.subtlest', '#5E6C84'),
            }}
          >
            <MessageSquare size={16} />
            Give feedback
          </button>

          <Button appearance="primary" onClick={onCreateVersion}>
            Create version
          </Button>
        </div>
      </div>

      {/* Release Versions Table */}
      <div>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          color: token('color.text', '#172B4D'),
          marginBottom: token('space.200', '16px'),
        }}>
          Release versions
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${token('color.border', '#DFE1E6')}` }}>
              <th style={{ 
                padding: token('space.100', '8px'), 
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                Version
              </th>
              <th style={{ 
                padding: token('space.100', '8px'), 
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                Status
              </th>
              <th style={{ 
                padding: token('space.100', '8px'), 
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                Progress
              </th>
              <th style={{ 
                padding: token('space.100', '8px'), 
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                Start date
              </th>
              <th style={{ 
                padding: token('space.100', '8px'), 
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                Release date
              </th>
              <th style={{ 
                padding: token('space.100', '8px'), 
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                Description
              </th>
              <th style={{ 
                padding: token('space.100', '8px'), 
                textAlign: 'right',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                More actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredVersions?.map((version) => (
              <tr 
                key={version.id}
                style={{ 
                  borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                  cursor: 'pointer',
                }}
                onClick={() => onVersionClick(version)}
              >
                <td style={{ padding: token('space.150', '12px') }}>
                  <a 
                    href="#" 
                    style={{ 
                      color: token('color.link', '#0052CC'), 
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                    onClick={(e) => e.preventDefault()}
                  >
                    {version.name}
                  </a>
                </td>
                <td style={{ padding: token('space.150', '12px') }}>
                  <Lozenge 
                    appearance={version.status === 'RELEASED' ? 'success' : 'default'}
                  >
                    {version.status}
                  </Lozenge>
                </td>
                <td style={{ padding: token('space.150', '12px'), width: 200 }}>
                  <div style={{ 
                    display: 'flex', 
                    height: 8, 
                    borderRadius: 4,
                    overflow: 'hidden',
                    backgroundColor: token('color.background.neutral', '#DFE1E6'),
                  }}>
                    <div style={{ 
                      width: `${version.progress * 0.6}%`,
                      backgroundColor: token('color.background.success.bold', '#36B37E'),
                    }} />
                    <div style={{ 
                      width: `${version.progress * 0.4}%`,
                      backgroundColor: token('color.background.brand.bold', '#0052CC'),
                    }} />
                  </div>
                </td>
                <td style={{ 
                  padding: token('space.150', '12px'),
                  color: token('color.text', '#172B4D'),
                  fontSize: '14px',
                }}>
                  {version.startDate ? format(new Date(version.startDate), 'MMMM d, yyyy') : ''}
                </td>
                <td style={{ 
                  padding: token('space.150', '12px'),
                  color: version.releaseDate && new Date(version.releaseDate) < new Date() 
                    ? token('color.text.danger', '#DE350B')
                    : token('color.link', '#0052CC'),
                  fontSize: '14px',
                }}>
                  {version.releaseDate ? format(new Date(version.releaseDate), 'MMMM d, yyyy') : ''}
                </td>
                <td style={{ 
                  padding: token('space.150', '12px'),
                  color: token('color.text.subtlest', '#5E6C84'),
                  fontSize: '14px',
                }}>
                  {version.description || ''}
                </td>
                <td style={{ padding: token('space.150', '12px'), textAlign: 'right' }}>
                  <DropdownMenu
                    trigger={({ triggerRef, ...props }) => (
                      <button
                        ref={triggerRef as any}
                        {...props}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: token('space.050', '4px'),
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: token('color.icon', '#5E6C84'),
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  >
                    <DropdownItemGroup>
                      <DropdownItem>Edit</DropdownItem>
                      <DropdownItem>Release</DropdownItem>
                      <DropdownItem>Archive</DropdownItem>
                    </DropdownItemGroup>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!filteredVersions || filteredVersions.length === 0) && (
          <div style={{
            padding: token('space.600', '48px'),
            textAlign: 'center',
            color: token('color.text.subtlest', '#5E6C84'),
          }}>
            No release versions found
          </div>
        )}
      </div>
    </div>
  );
};
