import { useState } from 'react';
import { useTeamMembers, useRemoveTeamMember } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserMinus, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AddTeamMemberDialog } from './AddTeamMemberDialog';

interface TeamMembersTabProps {
  teamId: string;
}

export function TeamMembersTab({ teamId }: TeamMembersTabProps) {
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const { data: members = [], isLoading } = useTeamMembers(teamId);
  const removeMember = useRemoveTeamMember();

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    await removeMember.mutateAsync({ id: memberId, teamId });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading members...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-foreground">
          Team Members ({members.length})
        </h3>
        <Button size="sm" onClick={() => setAddMemberOpen(true)}>
          <Plus className="w-3 h-3 mr-1" />
          Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>No team members yet</p>
            <Button variant="link" size="sm">
              Add your first member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {member.role || 'Member'}
                        </Badge>
                        {member.allocation_percentage && (
                          <span>• {member.allocation_percentage}% allocated</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}
      
      <AddTeamMemberDialog
        teamId={teamId}
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
      />
    </div>
  );
}
