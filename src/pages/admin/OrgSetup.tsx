import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Layers, Plus, UserCog } from 'lucide-react';
import { PortfolioDialog } from '@/components/forms/PortfolioDialog';
import { ProgramDialog } from '@/components/forms/ProgramDialog';
import { TeamDialog } from '@/components/forms/TeamDialog';
import { PortfolioMembersDialog } from '@/components/admin/PortfolioMembersDialog';
import { ProgramMembersDialog } from '@/components/admin/ProgramMembersDialog';
import { TeamMembersDialog } from '@/components/admin/TeamMembersDialog';

export default function OrgSetup() {
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [portfolioMembersDialog, setPortfolioMembersDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [programMembersDialog, setProgramMembersDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [teamMembersDialog, setTeamMembersDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  
  // Fetch programs (formerly portfolios)
  const { data: portfolios } = useQuery({
    queryKey: ['admin-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch projects (formerly programs)
  const { data: programs } = useQuery({
    queryKey: ['admin-programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*, programs(name)').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*, projects:projects!project_id(name)').order('name');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Organization Setup</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Configure portfolios, projects, and teams</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="text-sm text-muted-foreground">Projects</div>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portfolios</CardTitle>
              <CardDescription>Manage portfolio-level organization</CardDescription>
            </div>
            <Button onClick={() => setPortfolioDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Portfolio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Actions</TableHead>
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
                    {programs?.filter((p: any) => p.program_id === portfolio.id).length || 0}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPortfolioMembersDialog({ open: true, id: portfolio.id, name: portfolio.name })}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage Members
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>ARTs and project-level organization</CardDescription>
            </div>
            <Button onClick={() => setProgramDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Portfolio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs?.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium">{program.name}</TableCell>
                  <TableCell>{(program as any).programs?.name}</TableCell>
                  <TableCell>
                    <Badge variant={program.status === 'active' ? 'default' : 'outline'} className="capitalize">
                      {program.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {teams?.filter((t: any) => t.project_id === program.id).length || 0}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setProgramMembersDialog({ open: true, id: program.id, name: program.name })}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage Members
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Agile team configuration</CardDescription>
            </div>
            <Button onClick={() => setTeamDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Velocity Baseline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams?.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{(team as any).projects?.name}</TableCell>
                  <TableCell>{team.velocity_baseline || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={team.status === 'active' ? 'default' : 'outline'} className="capitalize">
                      {team.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTeamMembersDialog({ open: true, id: team.id, name: team.name })}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage Members
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <PortfolioDialog
        open={portfolioDialogOpen}
        onOpenChange={setPortfolioDialogOpen}
      />
      <ProgramDialog
        open={programDialogOpen}
        onOpenChange={setProgramDialogOpen}
      />
      <TeamDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
      />
      
      <PortfolioMembersDialog
        open={portfolioMembersDialog.open}
        onOpenChange={(open) => setPortfolioMembersDialog({ ...portfolioMembersDialog, open })}
        portfolioId={portfolioMembersDialog.id}
        portfolioName={portfolioMembersDialog.name}
      />
      <ProgramMembersDialog
        open={programMembersDialog.open}
        onOpenChange={(open) => setProgramMembersDialog({ ...programMembersDialog, open })}
        programId={programMembersDialog.id}
        programName={programMembersDialog.name}
      />
      <TeamMembersDialog
        open={teamMembersDialog.open}
        onOpenChange={(open) => setTeamMembersDialog({ ...teamMembersDialog, open })}
        teamId={teamMembersDialog.id}
        teamName={teamMembersDialog.name}
      />
    </div>
  );
}
