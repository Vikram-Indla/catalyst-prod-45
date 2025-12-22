/**
 * Product Roadmap V2 Page
 * Uses the new modular product-roadmap module
 */

import React from 'react';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';
import { ProductRoadmap } from '@/modules/product-roadmap/components/ProductRoadmap';

export const ProductRoadmapV2Page: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <GlobalPageHeader 
        sectionLabel="PRODUCT" 
        pageTitle="Product Roadmap" 
      />
      
      <div className="flex-1 min-h-0 overflow-hidden">
        <ProductRoadmap />
      </div>
    </div>
  );
};

export default ProductRoadmapV2Page;
