import React from 'react';
import { cn } from '@/lib/utils';
import { useSyncStatus } from '@/contexts/SyncStatusContext';
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  WifiOff,
  RefreshCw 
} from 'lucide-react';
import { Tooltip } from '@/components/ads';

export function SyncStatusIndicator() {
  const { status, lastSyncedAt, errorMessage, pendingChanges } = useSyncStatus();
  
  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 5) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    return date.toLocaleTimeString();
  };
  
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle,
          label: 'All changes saved',
          color: 'text-teal-500',
          bgColor: 'bg-teal-50 dark:bg-teal-900/20',
          dotColor: 'bg-teal-500',
        };
      case 'syncing':
        return {
          icon: Loader2,
          label: `Saving ${pendingChanges} change${pendingChanges !== 1 ? 's' : ''}...`,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          dotColor: 'bg-blue-500',
          animate: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: errorMessage || 'Sync failed',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          dotColor: 'bg-red-500',
        };
      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline - changes will sync when connected',
          color: 'text-amber-500',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          dotColor: 'bg-amber-500',
        };
    }
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  return (
    <Tooltip
      position="bottom"
      content={
        <>
          <p className="font-medium">{config.label}</p>
          {status === 'synced' && lastSyncedAt && (
            <p className="text-muted-foreground mt-0.5">
              Last saved {formatTime(lastSyncedAt)}
            </p>
          )}
          {status === 'error' && (
            <button
              className="flex items-center gap-1 text-blue-500 hover:text-blue-600 mt-1"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </>
      }
    >
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
        config.bgColor,
        config.color
      )}>
        <div className="relative flex items-center justify-center">
          <div className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
          {status === 'synced' && (
            <div className={cn('absolute w-1.5 h-1.5 rounded-full animate-ping', config.dotColor)} />
          )}
        </div>
        <Icon className={cn(
          'w-3 h-3',
          config.animate && 'animate-spin'
        )} />
        <span>
          {status === 'synced' ? 'Saved' :
           status === 'syncing' ? 'Saving...' :
           status === 'error' ? 'Error' : 'Offline'}
        </span>
      </div>
    </Tooltip>
  );
}
