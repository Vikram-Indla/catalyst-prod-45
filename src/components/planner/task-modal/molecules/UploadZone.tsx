// ============================================================================
// MOLECULE: UploadZone — File upload dropzone
// ============================================================================

import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { COLORS } from '../colors';

interface UploadZoneProps {
  onUpload: (files: FileList) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload }) => {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '40px',
        border: `2px dashed ${isHovered ? COLORS.accent : COLORS.borderDefault}`,
        borderRadius: '12px',
        backgroundColor: isHovered ? COLORS.accentLight : COLORS.surfacePage,
        textAlign: 'center',
        cursor: 'pointer',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
      }}
    >
      {/* ICON — CENTERED */}
      <Upload 
        size={48} 
        style={{ 
          color: isHovered ? COLORS.accent : COLORS.textLight, 
          marginBottom: '16px' 
        }} 
      />

      {/* TITLE */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: COLORS.textSecondary,
          margin: '0 0 6px 0'
        }}
      >
        Drop files here to upload
      </h3>

      {/* SUBTITLE */}
      <p style={{ fontSize: '14px', color: COLORS.textMuted, margin: 0 }}>
        or <span style={{ color: COLORS.accent, fontWeight: 500 }}>browse</span> to choose files
      </p>

      {/* HIDDEN INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
};

export default UploadZone;
