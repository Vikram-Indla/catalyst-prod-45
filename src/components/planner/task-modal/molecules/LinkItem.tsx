// ============================================================================
// MOLECULE: LinkItem — Single link item
// ============================================================================

import React, { useState } from 'react';
import { Link2, ExternalLink, Trash2 } from 'lucide-react';
import { COLORS } from '../colors';

interface LinkItemProps {
  id: string;
  url: string;
  title: string;
  onOpen: (url: string) => void;
  onDelete: (id: string) => void;
}

export const LinkItem: React.FC<LinkItemProps> = ({
  id,
  url,
  title,
  onOpen,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '16px 18px',
        backgroundColor: COLORS.surfaceCard,
        border: `1px solid ${isHovered ? COLORS.borderDefault : COLORS.borderLight}`,
        borderRadius: '12px',
        boxShadow: isHovered ? '0 2px 8px rgba(0, 0, 0, 0.04)' : 'none',
        transition: 'all 0.15s ease'
      }}
    >
      {/* ICON — 40px box with accent background */}
      <div
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: COLORS.accentLight,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Link2 size={20} style={{ color: COLORS.accent }} />
      </div>

      {/* INFO */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: COLORS.textPrimary,
            marginBottom: '4px'
          }}
        >
          {title}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: '13px',
            color: COLORS.accent,
            textDecoration: 'none',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {url}
        </a>
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.15s ease'
        }}
      >
        <ActionButton 
          icon={<ExternalLink size={16} />} 
          onClick={() => onOpen(url)} 
        />
        <ActionButton 
          icon={<Trash2 size={16} />} 
          onClick={() => onDelete(id)} 
        />
      </div>
    </div>
  );
};

// ActionButton same as ChecklistItem
const ActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ icon, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        backgroundColor: isHovered ? COLORS.surfaceHover : 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: isHovered ? COLORS.textMuted : COLORS.textLight,
        cursor: 'pointer',
        padding: 0
      }}
    >
      {icon}
    </button>
  );
};

export default LinkItem;
