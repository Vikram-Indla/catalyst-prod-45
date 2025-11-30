import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Github, Gitlab, MessageSquare, Webhook } from 'lucide-react';

export default function Integrations() {
  const { data: connectors } = useQuery({
    queryKey: ['integration-connectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_connectors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const getIntegrationIcon = (type: string) => {
    const icons: Record<string, any> = {
      github: Github,
      gitlab: Gitlab,
      jira: MessageSquare,
      slack: MessageSquare,
      teams: MessageSquare,
      webhook: Webhook,
    };
    
    const Icon = icons[type] || Webhook;
    return <Icon className="h-8 w-8" />;
  };

  const getStatusColor = (status: string | null) => {
    if (status === 'success') return 'text-success';
    if (status === 'fail') return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">Integrations</h1>
        <p className="text-muted-foreground">Connect external tools and services</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {connectors?.map((connector) => (
          <Card key={connector.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getIntegrationIcon(connector.type)}
                  <div>
                    <CardTitle>{connector.name}</CardTitle>
                    <CardDescription className="capitalize">{connector.type}</CardDescription>
                  </div>
                </div>
                <Switch checked={connector.enabled || false} disabled />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Endpoint</label>
                <p className="text-sm text-muted-foreground truncate">
                  {connector.endpoint || 'Not configured'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Authentication</label>
                <Badge variant="outline" className="mt-1 capitalize">
                  {connector.auth_method || 'None'}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium">Last Test Status</label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={connector.last_test_status === 'success' ? 'default' : 'outline'}
                    className={getStatusColor(connector.last_test_status)}
                  >
                    {connector.last_test_status || 'Never tested'}
                  </Badge>
                </div>
                {connector.last_test_message && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {connector.last_test_message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!connectors || connectors.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No integrations configured yet
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>Connect these external tools</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 border rounded-lg">
            <Github className="h-8 w-8 mb-2" />
            <div className="font-medium">GitHub</div>
            <div className="text-sm text-muted-foreground">Version control integration</div>
          </div>
          <div className="p-4 border rounded-lg">
            <Gitlab className="h-8 w-8 mb-2" />
            <div className="font-medium">GitLab</div>
            <div className="text-sm text-muted-foreground">DevOps platform</div>
          </div>
          <div className="p-4 border rounded-lg">
            <MessageSquare className="h-8 w-8 mb-2" />
            <div className="font-medium">Jira</div>
            <div className="text-sm text-muted-foreground">Issue tracking</div>
          </div>
          <div className="p-4 border rounded-lg">
            <MessageSquare className="h-8 w-8 mb-2" />
            <div className="font-medium">Slack</div>
            <div className="text-sm text-muted-foreground">Team communication</div>
          </div>
          <div className="p-4 border rounded-lg">
            <MessageSquare className="h-8 w-8 mb-2" />
            <div className="font-medium">MS Teams</div>
            <div className="text-sm text-muted-foreground">Collaboration platform</div>
          </div>
          <div className="p-4 border rounded-lg">
            <Webhook className="h-8 w-8 mb-2" />
            <div className="font-medium">Webhooks</div>
            <div className="text-sm text-muted-foreground">Custom integrations</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
