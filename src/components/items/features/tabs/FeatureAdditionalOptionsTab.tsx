import { Button } from '@/components/ui/button';
import { 
  ArrowDown, 
  Split, 
  Trash2, 
  XCircle, 
  Copy, 
  Kanban, 
  ListTree 
} from 'lucide-react';
import type { Feature } from '@/types/feature.types';

interface FeatureAdditionalOptionsTabProps {
  feature?: Feature;
  onAction: (action: string) => void;
}

export function FeatureAdditionalOptionsTab({ feature, onAction }: FeatureAdditionalOptionsTabProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Additional actions for managing this feature
      </div>

      {/* Workflow Actions */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm mb-3">Workflow Actions</h3>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onAction('drop')}
        >
          <ArrowDown className="w-4 h-4 mr-2" />
          Drop Feature
        </Button>

        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onAction('split')}
        >
          <Split className="w-4 h-4 mr-2" />
          Split Feature
        </Button>

        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onAction('copy')}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Feature
        </Button>

        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onAction('add-to-kanban')}
        >
          <Kanban className="w-4 h-4 mr-2" />
          Add to Kanban Board Column
        </Button>
      </div>

      {/* Reports */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm mb-3">Reports</h3>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => onAction('trace')}
        >
          <ListTree className="w-4 h-4 mr-2" />
          Trace This Feature
        </Button>
      </div>

      {/* Destructive Actions */}
      <div className="border border-destructive/20 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm mb-3 text-destructive">Destructive Actions</h3>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-yellow-600 hover:text-yellow-600 border-yellow-600/20"
          onClick={() => onAction('cancel')}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Cancel Item
        </Button>

        <Button 
          variant="outline" 
          className="w-full justify-start text-destructive hover:text-destructive border-destructive/20"
          onClick={() => onAction('delete')}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Feature
        </Button>
      </div>
    </div>
  );
}
