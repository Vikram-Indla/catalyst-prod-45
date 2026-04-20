/**
 * Real-time Collaboration Indicator
 * Shows who is currently viewing/editing a test case
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, Circle } from 'lucide-react';
import { Avatar, Lozenge, Tooltip } from '@/components/ads';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color: string;
  status: 'viewing' | 'editing';
  lastActive: Date;
  cursorPosition?: { section: string; field?: string };
}

interface CollaborationIndicatorProps {
  testCaseId: string;
  className?: string;
  compact?: boolean;
}

// Mock collaborators for demonstration
const MOCK_COLLABORATORS: Collaborator[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    color: '#2563EB',
    status: 'editing',
    lastActive: new Date(),
    cursorPosition: { section: 'steps', field: 'step-2' },
  },
  {
    id: '2',
    name: 'Mike Johnson',
    email: 'mike.j@company.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    color: '#10B981',
    status: 'viewing',
    lastActive: new Date(Date.now() - 30000),
  },
  {
    id: '3',
    name: 'Alex Kumar',
    email: 'alex.k@company.com',
    color: '#F59E0B',
    status: 'viewing',
    lastActive: new Date(Date.now() - 120000),
  },
];

export function CollaborationIndicator({
  testCaseId,
  className,
  compact = false,
}: CollaborationIndicatorProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Simulate real-time presence
  useEffect(() => {
    // In a real app, this would connect to a WebSocket or Supabase Realtime
    setCollaborators(MOCK_COLLABORATORS);

    // Simulate someone joining/leaving
    const interval = setInterval(() => {
      setCollaborators((prev) => {
        // Randomly update last active times
        return prev.map((c) => ({
          ...c,
          lastActive: c.status === 'editing' ? new Date() : c.lastActive,
        }));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [testCaseId]);

  const activeEditors = collaborators.filter((c) => c.status === 'editing');
  const viewers = collaborators.filter((c) => c.status === 'viewing');

  if (collaborators.length === 0) {
    return null;
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (compact) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className={cn("flex items-center gap-1 cursor-pointer", className)}>
            <div className="flex -space-x-2">
              {collaborators.slice(0, 3).map((c) => (
                <span
                  key={c.id}
                  className="inline-block rounded-full border-2 border-background"
                  style={{ borderColor: c.color }}
                >
                  <Avatar src={c.avatarUrl} name={c.name} size="xsmall" />
                </span>
              ))}
            </div>
            {collaborators.length > 3 && (
              <Lozenge appearance="default">
                +{collaborators.length - 3}
              </Lozenge>
            )}
            {activeEditors.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
              </motion.div>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-72">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {collaborators.length} people viewing
              </span>
            </div>
            <div className="space-y-2">
              {collaborators.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Avatar src={c.avatarUrl} name={c.name} size="xsmall" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(c.lastActive)}
                    </p>
                  </div>
                  {c.status === 'editing' ? (
                    <Lozenge appearance="inprogress">Editing</Lozenge>
                  ) : (
                    <Lozenge appearance="default">Viewing</Lozenge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <div className={cn("", className)}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{collaborators.length} collaborators</span>
        </div>

        <div className="flex -space-x-2">
          <AnimatePresence mode="popLayout">
            {collaborators.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                transition={{ delay: i * 0.05 }}
              >
                <Tooltip
                  position="bottom"
                  content={
                    <div className="text-center">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.status === 'editing' ? (
                          <>
                            Editing{' '}
                            {c.cursorPosition && (
                              <span className="text-primary">{c.cursorPosition.section}</span>
                            )}
                          </>
                        ) : (
                          `Viewing • ${formatTimeAgo(c.lastActive)}`
                        )}
                      </p>
                    </div>
                  }
                >
                  <div className="relative">
                    <span
                      className="inline-block rounded-full border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110"
                      style={{ borderColor: c.color }}
                    >
                      <Avatar
                        src={c.avatarUrl}
                        name={c.name}
                        size="small"
                        presence={c.status === 'editing' ? 'online' : undefined}
                      />
                    </span>
                  </div>
                </Tooltip>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {activeEditors.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"
            >
              <Circle className="w-2 h-2 fill-current" />
              <span>{activeEditors.length} editing</span>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Cursor presence indicator for showing where collaborators are editing
 */
export function CollaboratorCursor({
  collaborator,
  className,
}: {
  collaborator: Collaborator;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn("absolute pointer-events-none z-50", className)}
      style={{ color: collaborator.color }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="drop-shadow-sm"
      >
        <path d="M5.65376 12.4565L1.97168 1.58691L12.8383 5.26899L8.24407 7.92317L12.4489 12.128L10.3271 14.2498L6.12234 10.045L5.65376 12.4565Z" />
      </svg>
      <span
        className="ml-4 -mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded text-white whitespace-nowrap"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.name.split(' ')[0]}
      </span>
    </motion.div>
  );
}
