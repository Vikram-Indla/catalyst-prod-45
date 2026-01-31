import React from 'react';
import { CatyWidget } from '@/components/caty-ai';

function CatyTestPage() {
  const handleAction = (action: string) => {
    console.log('Caty action:', action);
    // Handle: 'extend-all', 'review', 'assign', 'compare', 'live-chat', 'schedule'
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f1f5f9', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '24px'
    }}>
      <CatyWidget 
        onAction={handleAction}
        initialContext={{
          department: 'Delivery Department',
          period: 'Q1 2026',
          view: 'Utilization View'
        }}
      />
    </div>
  );
}

export default CatyTestPage;
