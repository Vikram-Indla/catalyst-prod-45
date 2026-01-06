import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { EFDWizard } from '../components/EFDWizard';
import { EFDHeader } from '../components/EFDHeader';
import { useEFDStore } from '../stores/useEFDStore';
import { useCreateEFDSession, useEFDSession, useEFDSessions } from '../hooks/useEFDSession';
import { Loader2, FileText, Clock, CheckCircle, AlertCircle, Layers, Box } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const EFDesignerPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const { currentSessionId, setCurrentSessionId } = useEFDStore();
  const createSession = useCreateEFDSession();
  const { data: recentSessions, isLoading: sessionsLoading } = useEFDSessions();
  
  const activeSessionId = sessionIdParam || currentSessionId;
  const { data: session, isLoading: sessionLoading } = useEFDSession(activeSessionId);

  useEffect(() => {
    if (sessionIdParam && sessionIdParam !== currentSessionId) {
      setCurrentSessionId(sessionIdParam);
    }
  }, [sessionIdParam, currentSessionId, setCurrentSessionId]);

  const handleNewSession = async () => {
    const newSession = await createSession.mutateAsync();
    setSearchParams({ sessionId: newSession.id });
  };

  const handleOpenSession = (sessionId: string) => {
    setSearchParams({ sessionId });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'draft': return 'Draft';
      default: return status;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please sign in to use EF Designer</p>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <EFDHeader 
        session={session} 
        onNewSession={handleNewSession}
        isCreating={createSession.isPending}
      />
      
      {session ? (
        <EFDWizard session={session} />
      ) : (
        <div className="flex-1 p-6">
          <div className="w-full max-w-3xl mx-auto space-y-6">
            <div className="flex justify-center">
              <button
                onClick={handleNewSession}
                disabled={createSession.isPending}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Start New Session
              </button>
            </div>

            {/* Recent Sessions */}
            {sessionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentSessions && recentSessions.length > 0 ? (
              <div className="grid gap-3">
                {recentSessions.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => handleOpenSession(s.id)}
                    className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {s.text_input ? s.text_input.slice(0, 60) + (s.text_input.length > 60 ? '...' : '') : 'Untitled Session'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {getStatusIcon(s.status)}
                            {getStatusLabel(s.status)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {s.epics?.[0]?.count || 0} epics
                          </span>
                          <span className="flex items-center gap-1">
                            <Box className="h-3 w-3" />
                            {s.features?.[0]?.count || 0} features
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default EFDesignerPage;
