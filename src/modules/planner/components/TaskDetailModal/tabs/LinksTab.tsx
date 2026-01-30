// ============================================================
// LINKS TAB
// Add link form + links list
// ============================================================

import React, { useState } from 'react';
import { Link2, ExternalLink, Trash2 } from 'lucide-react';
import type { TaskLink } from '../types';

interface LinksTabProps {
  links: TaskLink[];
  onAddLink: (url: string, title: string) => void;
  onDeleteLink: (linkId: string) => void;
}

export const LinksTab: React.FC<LinksTabProps> = ({
  links,
  onAddLink,
  onDeleteLink,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const handleAddLink = () => {
    if (!newUrl.trim()) return;
    onAddLink(newUrl, newTitle || newUrl);
    setNewUrl('');
    setNewTitle('');
  };

  return (
    <div className="links-tab">
      {/* ADD LINK FORM */}
      <div className="add-link-form">
        <div className="link-field url-field">
          <label>URL</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
        </div>
        <div className="link-field">
          <label>Title (optional)</label>
          <input
            type="text"
            placeholder="Link title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </div>
        <button className="btn-add-link" onClick={handleAddLink}>
          Add Link
        </button>
      </div>

      {/* LINKS LIST */}
      {links.length === 0 ? (
        <div className="empty-state">
          <Link2 size={52} />
          <h3>No links yet</h3>
          <p>Add external links related to this task</p>
        </div>
      ) : (
        <div className="links-list">
          {links.map((link) => (
            <div key={link.id} className="link-item">
              <div className="link-icon">
                <Link2 size={20} />
              </div>
              <div className="link-info">
                <div className="link-title">{link.title}</div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-url"
                >
                  {link.url}
                </a>
              </div>
              <div className="link-actions">
                <button
                  className="item-action-btn"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  className="item-action-btn"
                  onClick={() => onDeleteLink(link.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
