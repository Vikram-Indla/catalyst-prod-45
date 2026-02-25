/**
 * Product Roadmap V2 Page
 * Uses the new modular product-roadmap module
 * Supports fullscreen mode that hides the page header and collapses sidebar
 */

import React, { useState, useCallback, useEffect } from 'react';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { ProductRoadmap } from '@/modules/product-roadmap/components/ProductRoadmap';
import { useCatalystContext } from '@/contexts/CatalystContext';

export const ProductRoadmapV2Page: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { sidebarExpanded, setSidebarExpanded } = useCatalystContext();
  const [prevSidebarState, setPrevSidebarState] = useState(true);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      if (!prev) {
        // Entering fullscreen: save sidebar state and collapse it
        setPrevSidebarState(sidebarExpanded);
        setSidebarExpanded(false);
      } else {
        // Exiting fullscreen: restore sidebar state
        setSidebarExpanded(prevSidebarState);
      }
      return !prev;
    });
  }, [sidebarExpanded, setSidebarExpanded, prevSidebarState]);

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        setSidebarExpanded(prevSidebarState);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, setSidebarExpanded, prevSidebarState]);

  return (
    <div className="flex flex-col h-full">
      {!isFullscreen && (
        <GlobalPageHeader 
          sectionLabel="PRODUCT" 
          pageTitle="Product Roadmap" 
        />
      )}
      
      <div className="flex-1 min-h-0 overflow-hidden">
        <ProductRoadmap 
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
};

export default ProductRoadmapV2Page;
