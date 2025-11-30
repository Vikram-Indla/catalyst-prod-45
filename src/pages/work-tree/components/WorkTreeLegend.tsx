import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Target, FileText, CheckSquare, ListTodo, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkTreeLegendProps {
  open: boolean;
  onClose: () => void;
}

export function WorkTreeLegend({ open, onClose }: WorkTreeLegendProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Work Tree Legend</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Work Item Icons */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Work Item Types</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Strategic Goal</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Theme / Theme Group</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Epic</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Feature</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Story</span>
              </div>
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Task</span>
              </div>
            </div>
          </div>

          {/* Health Status */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Health Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">On Track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">At Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Off Track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm">Unknown / N/A</span>
              </div>
            </div>
          </div>

          {/* Indicators */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Indicators</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1 text-xs">MP</Badge>
                <span className="text-sm">Multiple Programs</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1 text-xs">🔗</Badge>
                <span className="text-sm">Has Links</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1 text-xs">💬</Badge>
                <span className="text-sm">Has Discussions</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Has Questions</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1 text-xs">🏷️</Badge>
                <span className="text-sm">Has Tags</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
