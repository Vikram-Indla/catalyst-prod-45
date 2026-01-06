/**
 * API & Webhooks Section
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Key, Webhook, Copy, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ApiKey, Webhook as WebhookType } from '../../types/settings';

interface ApiWebhooksSectionProps {
  apiKeys: ApiKey[];
  webhooks: WebhookType[];
  onCreateApiKey: () => void;
  onRevokeApiKey: (keyId: string) => void;
  onCreateWebhook: () => void;
  onEditWebhook: (webhook: WebhookType) => void;
  onDeleteWebhook: (webhookId: string) => void;
  onToggleWebhook: (webhookId: string, active: boolean) => void;
  isLoading?: boolean;
}

export function ApiWebhooksSection({
  apiKeys,
  webhooks,
  onCreateApiKey,
  onRevokeApiKey,
  onCreateWebhook,
  onEditWebhook,
  onDeleteWebhook,
  onToggleWebhook,
  isLoading,
}: ApiWebhooksSectionProps) {
  const [showKey, setShowKey] = React.useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* API Keys Section */}
      <section className="bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Manage API keys for programmatic access
            </p>
          </div>
          <Button onClick={onCreateApiKey} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>

        <div className="divide-y divide-border">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Key className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No API keys</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create an API key to integrate with external systems
              </p>
              <Button onClick={onCreateApiKey} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create First Key
              </Button>
            </div>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{key.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono">
                        {key.key_prefix}...
                      </code>
                      <span>•</span>
                      <span>{key.scopes.join(', ')}</span>
                      {key.last_used_at && (
                        <>
                          <span>•</span>
                          <span>
                            Last used{' '}
                            {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={key.is_active ? 'default' : 'secondary'}>
                    {key.is_active ? 'Active' : 'Revoked'}
                  </Badge>
                  {key.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRevokeApiKey(key.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Webhooks Section */}
      <section className="bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Webhooks</h2>
            <p className="text-sm text-muted-foreground">
              Send event notifications to external URLs
            </p>
          </div>
          <Button onClick={onCreateWebhook} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        </div>

        <div className="divide-y divide-border">
          {webhooks.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Webhook className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No webhooks</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a webhook to receive event notifications
              </p>
              <Button onClick={onCreateWebhook} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create First Webhook
              </Button>
            </div>
          ) : (
            webhooks.map((webhook) => (
              <div key={webhook.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-md flex items-center justify-center',
                      webhook.is_active
                        ? 'bg-teal-100 dark:bg-teal-900/30'
                        : 'bg-muted'
                    )}
                  >
                    <Webhook
                      className={cn(
                        'h-5 w-5',
                        webhook.is_active ? 'text-teal-600' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{webhook.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[200px]">
                        {webhook.url}
                      </code>
                      <span>•</span>
                      <span>{webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {webhook.last_response_code && (
                    <Badge
                      variant={webhook.last_response_code < 400 ? 'default' : 'destructive'}
                      className="font-mono"
                    >
                      {webhook.last_response_code}
                    </Badge>
                  )}
                  <Switch
                    checked={webhook.is_active}
                    onCheckedChange={(v) => onToggleWebhook(webhook.id, v)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditWebhook(webhook)}>
                        Edit Webhook
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDeleteWebhook(webhook.id)}
                      >
                        Delete Webhook
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
