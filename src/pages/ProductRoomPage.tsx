import React from 'react';
import { PageChrome } from '@/components/layout/PageChrome';
import { LayoutGrid } from 'lucide-react';

export default function ProductRoomPage() {
  return (
    <PageChrome>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Product Room</h2>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </PageChrome>
  );
}
