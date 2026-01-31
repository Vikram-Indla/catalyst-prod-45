/**
 * CATY AI V7 — Blur Heavy Backdrop Component
 */

import React, { useEffect } from 'react';

interface CatyBackdropProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const CatyBackdrop: React.FC<CatyBackdropProps> = ({ isOpen, onClose }) => {
  // Prevent body scroll when backdrop is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('caty-backdrop-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('caty-backdrop-open');
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('caty-backdrop-open');
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="caty-backdrop-overlay"
      onClick={onClose}
      aria-hidden="true"
      role="presentation"
    />
  );
};

export default CatyBackdrop;
