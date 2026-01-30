// ============================================================================
// MOLECULE: FileItem — Single file item
// ============================================================================

import React, { useState } from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
import { COLORS } from '../colors';

interface FileItemProps {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'doc' | 'img' | 'other';
  uploadedAt: string;
  onDownload?: (id: string) => void;
  onDelete: (id: string) => void;
}

const FILE_TYPE_STYLES = {
  pdf: { bg: COLORS.filePdfBg, color: COLORS.filePdfIcon },
  doc: { bg: COLORS.fileDocBg, color: COLORS.fileDocIcon },
  img: { bg: COLORS.fileImgBg, color: COLORS.fileImgIcon },
  other: { bg: COLORS.surfacePage, color: COLORS.textMuted }
};

export const FileItem: React.FC<FileItemProps> = ({
  id,
  name,
  size,
  type,
  uploadedAt,
  onDownload,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const styles = FILE_TYPE_STYLES[type];

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
        borderRadius: '10px',
        boxShadow: isHovered ? '0 2px 8px rgba(0, 0, 0, 0.04)' : 'none',
        transition: 'all 0.15s ease'
      }}
    >
      {/* FILE ICON — 44px box */}
      <div
        style={{
          width: '44px',
          height: '44px',
          backgroundColor: styles.bg,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <FileText size={22} style={{ color: styles.color }} />
      </div>

      {/* INFO */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: COLORS.textPrimary,
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: '13px', color: COLORS.textMuted }}>
          {size} · {uploadedAt}
        </div>
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
        {onDownload && (
          <ActionButton 
            icon={<Download size={16} />} 
            onClick={() => onDownload(id)} 
          />
        )}
        <ActionButton 
          icon={<Trash2 size={16} />} 
          onClick={() => onDelete(id)} 
        />
      </div>
    </div>
  );
};

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

export default FileItem;
