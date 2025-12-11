import React from 'react';
import { Archive } from 'lucide-react';

interface ArchivedTabProps {
  projectId: string;
}

export const ArchivedTab: React.FC<ArchivedTabProps> = ({ projectId }) => {
  // TODO: Fetch archived items
  const archivedItems: any[] = [];

  return (
    <div className="p-6 bg-background min-h-full">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-2">
        Spaces / Enterprise Shared Services
      </div>

      <h2 className="text-2xl font-medium text-foreground mb-6">
        Archived work items
      </h2>

      {archivedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Archive className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">
            No archived work items
          </h3>
          <p className="text-sm text-muted-foreground max-w-[400px]">
            When you archive work items, they will appear here. You can restore them at any time.
          </p>
        </div>
      ) : (
        <div>
          {/* Table would go here */}
        </div>
      )}
    </div>
  );
};
