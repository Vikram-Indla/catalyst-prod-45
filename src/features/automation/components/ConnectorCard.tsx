/**
 * Module 5A-1: Connector Card Component
 */

import React, { memo } from 'react';
import { Settings, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useConnectorTest, useConnectorMutations } from '../hooks/useConnectors';
import { 
  CONNECTOR_TYPE_CONFIG, 
  CONNECTION_STATUS_CONFIG, 
  type AutomationConnector 
} from '../types/connector';
import { format } from 'date-fns';

interface ConnectorCardProps {
  connector: AutomationConnector;
  onEdit: () => void;
}

export const ConnectorCard = memo(function ConnectorCard({
  connector,
  onEdit
}: ConnectorCardProps) {
  const typeConfig = CONNECTOR_TYPE_CONFIG[connector.connector_type];
  const statusConfig = CONNECTION_STATUS_CONFIG[connector.connection_status];
  const { testConnection, isTesting } = useConnectorTest();
  const { deleteConnector } = useConnectorMutations();

  return (
    <div className={`bg-card rounded-xl border-2 p-6 transition-all ${
      connector.is_active ? 'border-border' : 'border-muted opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-muted"
          >
            {typeConfig.icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{connector.name}</h3>
            <p className="text-sm text-muted-foreground">{typeConfig.label}</p>
          </div>
        </div>
        <Badge variant={statusConfig.variant}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-y border-border">
        <div>
          <div className="text-2xl font-bold text-foreground">{connector.stats.total_imports}</div>
          <div className="text-xs text-muted-foreground">Total Imports</div>
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">
            {connector.stats.last_import 
              ? format(new Date(connector.stats.last_import), 'MMM d, yyyy')
              : 'Never'}
          </div>
          <div className="text-xs text-muted-foreground">Last Import</div>
        </div>
      </div>

      {/* Webhook URL */}
      {connector.webhook_url && (
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Webhook URL</div>
          <code className="text-xs text-foreground break-all">{connector.webhook_url}</code>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => testConnection(connector.id)}
          disabled={isTesting}
          className="flex-1"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
          Test
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Settings className="w-4 h-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Connector</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{connector.name}"? This will also remove all associated import history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteConnector(connector.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});
