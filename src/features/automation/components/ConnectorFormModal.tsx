/**
 * Module 5A-1: Connector Form Modal Component
 */

import React, { useState, memo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useConnectorMutations } from '../hooks/useConnectors';
import { CONNECTOR_TYPE_CONFIG, type ConnectorType, type AutomationConnector } from '../types/connector';

interface ConnectorFormModalProps {
  open: boolean;
  onClose: () => void;
  connector?: AutomationConnector;
}

export const ConnectorFormModal = memo(function ConnectorFormModal({
  open,
  onClose,
  connector
}: ConnectorFormModalProps) {
  const [name, setName] = useState('');
  const [connectorType, setConnectorType] = useState<ConnectorType>('selenium');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const { createConnector, updateConnector, isLoading } = useConnectorMutations();

  // Reset form when connector changes
  useEffect(() => {
    if (connector) {
      setName(connector.name);
      setConnectorType(connector.connector_type);
      setWebhookUrl(connector.webhook_url || '');
      setIsActive(connector.is_active);
    } else {
      setName('');
      setConnectorType('selenium');
      setWebhookUrl('');
      setIsActive(true);
    }
  }, [connector, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (connector) {
      await updateConnector(connector.id, { name, webhookUrl, isActive });
    } else {
      await createConnector(name, connectorType, {}, webhookUrl || undefined);
    }
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{connector ? 'Edit Connector' : 'Add Connector'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Connector Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., CI Pipeline Selenium"
              required
            />
          </div>

          {!connector && (
            <div className="space-y-2">
              <Label htmlFor="type">Framework Type</Label>
              <Select value={connectorType} onValueChange={v => setConnectorType(v as ConnectorType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONNECTOR_TYPE_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                        <span className="text-muted-foreground text-xs">- {config.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook URL (Optional)</Label>
            <Input
              id="webhook"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://your-ci-server.com/webhook"
            />
            <p className="text-xs text-muted-foreground">Results will be posted to this URL</p>
          </div>

          {connector && (
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : connector ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
