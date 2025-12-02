import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export default function HierarchyConfig() {
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['hierarchy-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hierarchy_configs')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s6)] space-y-[var(--s4)] sm:space-y-[var(--s6)]">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">Hierarchy Configuration</h1>
        <p className="text-muted-foreground">Configure work item hierarchy levels</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SAFe Hierarchy Levels</CardTitle>
          <CardDescription>
            Enable or disable hierarchy levels for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hierarchyLevels?.map((level) => (
                <TableRow key={level.id}>
                  <TableCell className="font-medium">{level.level_key}</TableCell>
                  <TableCell>{level.display_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{level.sort_order}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={level.enabled ? 'default' : 'secondary'}>
                      {level.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={level.enabled || false} disabled />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default SAFe Hierarchy</CardTitle>
          <CardDescription>Standard Scaled Agile Framework levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-[var(--s4)]">
          <div className="grid gap-[var(--s3)]">
            <div className="flex items-center justify-between p-[var(--s3)] border rounded-lg">
              <div>
                <div className="font-medium">Portfolio Level</div>
                <div className="text-sm text-muted-foreground">Strategic Themes → Initiatives</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Large Solution Level</div>
                <div className="text-sm text-muted-foreground">Solution → Capabilities → Enablers</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Program Level</div>
                <div className="text-sm text-muted-foreground">Epics → Features</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Team Level</div>
                <div className="text-sm text-muted-foreground">Stories → Sub-tasks</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
