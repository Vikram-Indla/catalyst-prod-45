import React from 'react';
import { token } from '@atlaskit/tokens';
import EmptyState from '@atlaskit/empty-state';
import { Archive } from 'lucide-react';

interface ArchivedTabProps {
  projectId: string;
}

export const ArchivedTab: React.FC<ArchivedTabProps> = ({ projectId }) => {
  // TODO: Fetch archived items
  const archivedItems: any[] = [];

  return (
    <div style={{ 
      padding: token('space.300', '24px'),
      backgroundColor: token('elevation.surface', '#FFFFFF'),
      minHeight: '100%',
    }}>
      {/* Breadcrumb */}
      <div style={{ 
        fontSize: '14px', 
        color: token('color.text.subtlest', '#5E6C84'),
        marginBottom: token('space.100', '8px'),
      }}>
        Spaces / Enterprise Shared Services
      </div>

      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: 500, 
        color: token('color.text', '#172B4D'),
        margin: 0,
        marginBottom: token('space.300', '24px'),
      }}>
        Archived work items
      </h2>

      {archivedItems.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: token('space.800', '64px'),
          textAlign: 'center',
        }}>
          <div style={{
            width: 80,
            height: 80,
            backgroundColor: token('color.background.neutral', '#F4F5F7'),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: token('space.300', '24px'),
          }}>
            <Archive size={32} color={token('color.icon.subtle', '#5E6C84')} />
          </div>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 500, 
            color: token('color.text', '#172B4D'),
            margin: 0,
            marginBottom: token('space.100', '8px'),
          }}>
            No archived work items
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: token('color.text.subtlest', '#5E6C84'),
            margin: 0,
            maxWidth: 400,
          }}>
            When you archive work items, they will appear here. You can restore them at any time.
          </p>
        </div>
      ) : (
        <div>
          {/* Table would go here */}
        </div>
      )}
    </div>
  );
};
