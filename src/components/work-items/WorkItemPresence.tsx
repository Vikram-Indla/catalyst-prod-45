import { Avatar, Tooltip } from '@/components/ads';
import { useWorkItemPresence } from '@/hooks/useWorkItemPresence';
import { Eye, Pencil } from 'lucide-react';

interface WorkItemPresenceProps {
  workItemType: string;
  workItemId: string;
}

export function WorkItemPresence({ workItemType, workItemId }: WorkItemPresenceProps) {
  const { presenceUsers, isEditing } = useWorkItemPresence(workItemType, workItemId);

  if (presenceUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {isEditing && (
        <span className="text-xs text-amber-600 mr-1 flex items-center gap-1">
          <Pencil className="h-3 w-3" />
          Being edited
        </span>
      )}
      <div className="flex -space-x-2">
        {presenceUsers.slice(0, 5).map((user) => (
          <Tooltip
            key={user.id}
            position="bottom"
            content={
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
            }
          >
            <span className="border-2 border-white rounded-full inline-block">
              <Avatar
                name={user.user_name || user.user_email || '?'}
                size="xsmall"
                presence={user.status === 'editing' ? 'busy' : 'online'}
              />
            </span>
          </Tooltip>
        ))}
      </div>
      {presenceUsers.length > 5 && (
        <span className="text-xs text-muted-foreground ml-1">
          +{presenceUsers.length - 5} more
        </span>
      )}
    </div>
  );
}
