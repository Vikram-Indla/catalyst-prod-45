// ============================================================================
// ORGANISM: LinksTab — Links tab content
// ============================================================================

import React from 'react';
import { Link2 } from 'lucide-react';
import { AddLinkForm, LinkItem, EmptyState } from '../../molecules';
import { TaskLink } from '../../types';

interface LinksTabProps {
  links: TaskLink[];
  onAdd: (url: string, title: string) => void;
  onDelete: (id: string) => void;
}

export const LinksTab: React.FC<LinksTabProps> = ({
  links,
  onAdd,
  onDelete
}) => {
  const handleOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      {/* ADD LINK FORM */}
      <AddLinkForm onAdd={onAdd} />

      {/* LINKS LIST OR EMPTY STATE */}
      {links.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {links.map((link) => (
            <LinkItem
              key={link.id}
              id={link.id}
              url={link.url}
              title={link.title}
              onOpen={handleOpen}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Link2 size={52} />}
          title="No links yet"
          description="Add links to relevant resources"
        />
      )}
    </div>
  );
};

export default LinksTab;
