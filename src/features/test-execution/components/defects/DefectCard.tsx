/**
 * Module 3A-4: Defect Card Component
 * Displays a defect with status and severity badges
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Unlink, ExternalLink } from 'lucide-react';
import { 
  LinkedDefect, 
  DefectSearchResult,
  STATUS_CONFIG, 
  SEVERITY_CONFIG 
} from '../../types/defect-linking';

interface DefectCardProps {
  defect: LinkedDefect | DefectSearchResult;
  showUnlink?: boolean;
  showLink?: boolean;
  isUnlinking?: boolean;
  isLinking?: boolean;
  onUnlink?: () => void;
  onLink?: () => void;
}

export function DefectCard({
  defect,
  showUnlink = false,
  showLink = false,
  isUnlinking = false,
  isLinking = false,
  onUnlink,
  onLink,
}: DefectCardProps) {
  const statusConfig = STATUS_CONFIG[defect.status] || STATUS_CONFIG.open;
  const severityConfig = SEVERITY_CONFIG[defect.severity] || SEVERITY_CONFIG.minor;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono font-medium text-primary">
            {defect.key}
          </span>
          <Badge 
            variant="secondary" 
            className={cn('text-xs px-1.5 py-0', severityConfig.bgClass, severityConfig.textClass)}
          >
            {severityConfig.label}
          </Badge>
        </div>
        
        <p className="text-sm text-foreground truncate mb-2">
          {defect.title}
        </p>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn('text-xs', statusConfig.bgClass, statusConfig.textClass)}
          >
            {statusConfig.label}
          </Badge>
          
          {defect.assignee && (
            <span className="text-xs text-muted-foreground">
              → {defect.assignee.name}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        {showLink && (
          <Button
            variant="default"
            size="sm"
            onClick={onLink}
            disabled={isLinking}
            className="h-7 px-2"
          >
            {isLinking ? 'Linking...' : 'Link'}
          </Button>
        )}
        
        {showUnlink && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onUnlink}
            disabled={isUnlinking}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Unlink defect"
          >
            <Unlink className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          title="Open defect"
          onClick={() => {
            // Navigate to defect detail (future enhancement)
            console.log('Open defect:', defect.id);
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
