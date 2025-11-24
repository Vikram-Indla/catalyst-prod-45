import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Layers } from 'lucide-react';

export default function OrgSetup() {
  const { data: portfolios } = useQuery({
    queryKey: ['admin-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('portfolios').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['admin-programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*, portfolios(name)').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*, programs(name)').order('name');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Setup</h1>
        <p className="text-muted-foreground">Configure portfolios, programs, and teams</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Building2 className="h-10 w-10 text-primary" />
              <div>
                <div className="text-3xl font-bold">{portfolios?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Portfolios</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Layers className="h-10 w-10 text-primary" />
              <div>
                <div className="text-3xl font-bold">{programs?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Programs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-10 w-10 text-primary" />
              <div>
                <div className="text-3xl font-bold">{teams?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Teams</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolios</CardTitle>
          <CardDescription>Manage portfolio-level organization</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Programs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolios?.map((portfolio) => (
                <TableRow key={portfolio.id}>
                  <TableCell className="font-medium">{portfolio.name}</TableCell>
                  <TableCell>
                    <Badge variant={portfolio.status === 'active' ? 'default' : 'outline'} className="capitalize">
                      {portfolio.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {programs?.filter(p => p.portfolio_id === portfolio.id).length || 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programs</CardTitle>
          <CardDescription>ARTs and program-level organization</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Portfolio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Teams</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs?.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium">{program.name}</TableCell>
                  <TableCell>{program.portfolios?.name}</TableCell>
                  <TableCell>
                    <Badge variant={program.status === 'active' ? 'default' : 'outline'} className="capitalize">
                      {program.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {teams?.filter(t => t.program_id === program.id).length || 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Agile team configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Velocity Baseline</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams?.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.programs?.name}</TableCell>
                  <TableCell>{team.velocity_baseline || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={team.status === 'active' ? 'default' : 'outline'} className="capitalize">
                      {team.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
