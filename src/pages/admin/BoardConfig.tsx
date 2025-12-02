import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BoardConfig() {
  const [boardTypeFilter, setboardTypeFilter] = useState<'portfolio_kanban' | 'program_board' | 'sprint_board' | ''>('');

  const { data: boardConfigs } = useQuery({
    queryKey: ['board-configs', boardTypeFilter],
    queryFn: async () => {
      let query = supabase.from('board_configs').select('*').order('board_type');
      
      if (boardTypeFilter) {
        query = query.eq('board_type', boardTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getBoardTypeName = (type: string) => {
    const names: Record<string, string> = {
      portfolio_kanban: 'Portfolio Kanban',
      program_board: 'Program Board',
      sprint_board: 'Sprint Board',
    };
    return names[type] || type;
  };

  return (
    <div className="px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s6)] space-y-[var(--s4)] sm:space-y-[var(--s6)]">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">Board Configuration</h1>
        <p className="text-muted-foreground">Configure kanban boards and columns</p>
      </div>

      <div className="flex gap-[var(--s4)]">
        <Select value={boardTypeFilter || undefined} onValueChange={(value) => setboardTypeFilter(value as typeof boardTypeFilter)}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Board Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portfolio_kanban">Portfolio Kanban</SelectItem>
            <SelectItem value="program_board">Program Board</SelectItem>
            <SelectItem value="sprint_board">Sprint Board</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Board Configurations</CardTitle>
          <CardDescription>Manage board layouts and column definitions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Board Type</TableHead>
                <TableHead>Scope Type</TableHead>
                <TableHead>Scope ID</TableHead>
                <TableHead>Columns</TableHead>
                <TableHead>Swimlanes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boardConfigs?.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    <Badge>{getBoardTypeName(config.board_type)}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{config.scope_type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {config.scope_id || 'Global'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {Array.isArray(config.columns_json) ? config.columns_json.length : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {config.swimlane_rule ? 'Configured' : 'None'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(!boardConfigs || boardConfigs.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No board configurations found
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Default Board Types</CardTitle>
          <CardDescription>Standard SAFe board configurations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-[var(--s3)]">
          <div className="flex items-center justify-between p-[var(--s3)] border rounded-lg">
            <div>
              <div className="font-medium">Portfolio Kanban</div>
              <div className="text-sm text-muted-foreground">
                Columns: Funnel → Analyzing → Backlog → Implementing → Done
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Program Board</div>
              <div className="text-sm text-muted-foreground">
                Iteration-based columns with team swimlanes
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Sprint Board</div>
              <div className="text-sm text-muted-foreground">
                Columns: To Do → In Progress → Done
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
