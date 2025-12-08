import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation, RoomType } from '@/contexts/NavigationContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Target, Briefcase, GitBranch, Users } from 'lucide-react';

/**
 * Top navigation bar with Catalyst-style rooms
 * Source: https://help.jiraalign.com/hc/en-us/articles/17158556046612-Navigate-Jira-Align
 * 
 * Rooms provide different perspectives on the same data:
 * - Strategy Room: Company-level objectives and strategic planning
 * - Portfolio Room: Portfolio-level execution and strategic themes
 * - Program Room: Program Increment planning and execution (ART level)
 * - Team Room: Team-level sprint planning and execution
 */

interface Room {
  id: RoomType;
  label: string;
  icon: any;
  defaultPath: string;
}

const rooms: Room[] = [
  { 
    id: 'strategy', 
    label: 'Strategy', 
    icon: Target, 
    defaultPath: '/strategy-room' 
  },
  { 
    id: 'program', 
    label: 'Program', 
    icon: Briefcase, 
    defaultPath: '/program-room' 
  },
  { 
    id: 'project', 
    label: 'Project', 
    icon: GitBranch, 
    defaultPath: '/project-room' 
  },
  { 
    id: 'team', 
    label: 'Team', 
    icon: Users, 
    defaultPath: '/team-room' 
  },
];

export function RoomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRoom, setCurrentRoom } = useNavigation();
  
  // Determine current room from path
  const determineCurrentRoom = (pathname: string): RoomType => {
    if (pathname.includes('strategy')) return 'strategy';
    if (pathname.includes('project') || pathname.includes('programs/')) return 'project';
    if (pathname.includes('team') || pathname.includes('backlog') || pathname.includes('sprint') || pathname.includes('work-items')) return 'team';
    return 'program';
  };
  
  const activeRoom = determineCurrentRoom(location.pathname);
  
  const handleRoomChange = (room: Room) => {
    setCurrentRoom(room.id);
    navigate(room.defaultPath);
  };
  
  return (
    <div className="flex items-center gap-1 border-r pr-4">
      {rooms.map((room) => {
        const Icon = room.icon;
        const isActive = activeRoom === room.id;
        
        return (
          <Button
            key={room.id}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleRoomChange(room)}
            className={cn(
              'gap-2 font-medium',
              isActive && 'shadow-sm'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{room.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
