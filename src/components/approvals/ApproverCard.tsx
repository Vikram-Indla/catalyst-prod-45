import React from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { TransitionApprover, ApprovalStatus } from '@/types/approval';
import { APPROVAL_STATUS_CONFIG } from '@/types/approval';

interface ApproverCardProps {
  approver: TransitionApprover;
  canRespond: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
  onSetVeto?: () => void;
}

export function ApproverCard({
  approver,
  canRespond,
  onApprove,
  onReject,
  onRemove,
  onSetVeto,
}: ApproverCardProps) {
  const statusConfig = APPROVAL_STATUS_CONFIG[approver.status as ApprovalStatus];
  const initials = approver.approver?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??';

  const getBorderClass = () => {
    switch (approver.status) {
      case 'approved':
        return 'border-l-4 border-l-green-500 bg-green-500/5';
      case 'pending':
        return 'border-l-4 border-l-amber-500 bg-amber-500/5';
      case 'rejected':
        return 'border-l-4 border-l-red-500 bg-red-500/5';
      default:
        return 'border-l-4 border-l-muted bg-muted/5';
    }
  };

  return (
    <div className={`p-4 rounded-lg border border-border ${getBorderClass()}`}>
      <div className="flex items-start gap-3">
        {/* Avatar with status indicator */}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={approver.approver?.avatar_url} />
            <AvatarFallback className="text-xs bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div 
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center"
            style={{ backgroundColor: statusConfig.color }}
          >
            {approver.status === 'approved' && <Check className="h-2.5 w-2.5 text-white" />}
            {approver.status === 'rejected' && <X className="h-2.5 w-2.5 text-white" />}
            {approver.status === 'pending' && <Clock className="h-2.5 w-2.5 text-white" />}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">
              {approver.approver?.full_name || 'Unknown User'}
            </span>
            {approver.is_veto && (
              <Badge 
                className="text-[10px] px-1.5 py-0 h-5 font-semibold border-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(45, 93%, 58%) 0%, hsl(38, 92%, 50%) 100%)',
                  color: 'hsl(28, 73%, 26%)',
                }}
              >
                <Zap className="h-3 w-3 mr-0.5" />
                VETO
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>Step {approver.step_order}</span>
            <span>•</span>
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-4 border-0"
              style={{ 
                backgroundColor: statusConfig.bgColor, 
                color: statusConfig.color 
              }}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {approver.responded_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Responded {format(new Date(approver.responded_at), 'MMM d, yyyy')}
            </p>
          )}

          {approver.status === 'pending' && approver.due_date && (
            <p className="text-xs text-amber-600 mt-1">
              Due {format(new Date(approver.due_date), 'MMM d, yyyy')}
            </p>
          )}

          {approver.comment && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              "{approver.comment}"
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {canRespond && approver.status === 'pending' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-green-500 text-green-600 hover:bg-green-500/10"
                onClick={onApprove}
              >
                <Check className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-red-500 text-red-600 hover:bg-red-500/10"
                onClick={onReject}
              >
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </div>
          )}
          
          {!approver.is_veto && onSetVeto && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-amber-600"
              onClick={onSetVeto}
            >
              <Zap className="h-3 w-3 mr-1" />
              Grant Veto
            </Button>
          )}
          
          {onRemove && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
