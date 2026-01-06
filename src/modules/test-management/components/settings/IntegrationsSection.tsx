/**
 * Integrations Section
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ProjectIntegration, IntegrationType, IntegrationMetadata } from '../../types/settings';

interface IntegrationsSectionProps {
  integrations: ProjectIntegration[];
  onConnect: (type: IntegrationType) => void;
  onDisconnect: (integrationId: string) => void;
  onConfigure: (integration: ProjectIntegration) => void;
  isLoading?: boolean;
}

const availableIntegrations: IntegrationMetadata[] = [
  {
    type: 'jira',
    name: 'Jira',
    description: 'Sync defects and link test cases to Jira issues',
    icon: '🎫',
    color: '#0052CC',
    features: ['Import issues', 'Sync defects', 'Link test cases'],
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Get notifications in your Slack channels',
    icon: '💬',
    color: '#4A154B',
    features: ['Test failures', 'Cycle completed', 'Defect alerts'],
  },
  {
    type: 'github',
    name: 'GitHub',
    description: 'Link tests to commits and pull requests',
    icon: '🐙',
    color: '#24292e',
    features: ['PR comments', 'Status checks', 'Code coverage'],
  },
  {
    type: 'azure_devops',
    name: 'Azure DevOps',
    description: 'Integrate with Azure Boards and Pipelines',
    icon: '☁️',
    color: '#0078D4',
    features: ['Work items', 'Pipelines', 'Boards'],
  },
  {
    type: 'jenkins',
    name: 'Jenkins',
    description: 'Trigger test runs from CI/CD pipelines',
    icon: '🔧',
    color: '#D33833',
    features: ['Pipeline trigger', 'Results sync', 'Artifacts'],
  },
  {
    type: 'microsoft_teams',
    name: 'Microsoft Teams',
    description: 'Get notifications in your Teams channels',
    icon: '👥',
    color: '#5059C9',
    features: ['Notifications', 'Bot commands', 'Cards'],
  },
];

export function IntegrationsSection({
  integrations,
  onConnect,
  onDisconnect,
  onConfigure,
  isLoading,
}: IntegrationsSectionProps) {
  const getIntegrationStatus = (type: IntegrationType) => {
    return integrations.find((i) => i.integration_type === type);
  };

  return (
    <div className="space-y-6">
      <section className="bg-background border border-border rounded-xl">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Connected Apps</h2>
          <p className="text-sm text-muted-foreground">
            Connect your favorite tools to streamline your workflow
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableIntegrations.map((meta) => {
              const integration = getIntegrationStatus(meta.type);
              const isConnected = integration?.status === 'connected';

              return (
                <div
                  key={meta.type}
                  className={cn(
                    'flex flex-col p-5 border rounded-xl transition-all',
                    isConnected
                      ? 'border-teal-300 dark:border-teal-700 bg-gradient-to-b from-teal-50 to-background dark:from-teal-900/20'
                      : 'border-border hover:border-muted-foreground hover:shadow-md'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="h-10 w-10 rounded-md flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                    >
                      {meta.icon}
                    </div>
                    <Badge
                      variant={isConnected ? 'default' : 'secondary'}
                      className={cn(
                        isConnected && 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      )}
                    >
                      {isConnected ? 'Connected' : 'Not connected'}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-foreground mb-1">{meta.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">{meta.description}</p>

                  <div className="flex items-center justify-between">
                    {isConnected && integration?.last_sync_at && (
                      <span className="text-xs text-muted-foreground">
                        Last sync:{' '}
                        {formatDistanceToNow(new Date(integration.last_sync_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                    {!isConnected && <span />}
                    {isConnected ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onConfigure(integration!)}
                        >
                          Configure
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDisconnect(integration!.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => onConnect(meta.type)}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
