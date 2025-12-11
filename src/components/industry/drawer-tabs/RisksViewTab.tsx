import { AlertTriangle } from 'lucide-react';
import { BusinessRequest } from '@/types/business-request';

interface RisksViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function RisksViewTab({ data }: RisksViewTabProps) {
  return (
    <div className="p-6">
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Risk Management Coming Soon</h3>
        <p className="text-sm max-w-md mx-auto">
          Identify, assess, and track risks associated with this demand request. 
          This feature is under development.
        </p>
      </div>
    </div>
  );
}
