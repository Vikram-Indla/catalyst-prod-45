import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWorkItemPresence } from '@/hooks/useWorkItemPresence';
import { Eye, Pencil } from 'lucide-react';

interface WorkItemPresenceProps {
  workItemType: string;
  workItemId: string;
}

export function WorkItemPresence({ workItemType, workItemId }: WorkItemPresenceProps) {
  const { presenceUsers, isEditing } = useWorkItemPresence(workItemType, workItemId);

  if (presenceUsers.length === 0) return null;

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {isEditing && (
          <span className="text-xs text-amber-600 mr-1 flex items-center gap-1">
            <Pencil className="h-3 w-3" />
            Being edited
          </span>
        )}
        <div className="flex -space-x-2">
          {presenceUsers.slice(0, 5).map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-6 w-6 border-2 border-white">
                    <AvatarFallback 
                      className={`text-[10px] ${
                        user.status === 'editing' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-brand-gold/20 text-brand-gold'
                      }`}
                    >
                      {getInitials(user.user_name, user.user_email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${
                    user.status === 'editing' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="flex items-center gap-1">
                  {user.status === 'editing' ? (
                    <Pencil className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  <span>{user.user_name || user.user_email}</span>
                  <span className="text-muted-foreground">
                    is {user.status === 'editing' ? 'editing' : 'viewing'}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {presenceUsers.length > 5 && (
          <span className="text-xs text-muted-foreground ml-1">
            +{presenceUsers.length - 5} more
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
