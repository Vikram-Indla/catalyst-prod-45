import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { EFDWizard } from '../components/EFDWizard';
import { EFDHeader } from '../components/EFDHeader';
import { useEFDStore } from '../stores/useEFDStore';
import { useCreateEFDSession, useEFDSession } from '../hooks/useEFDSession';
import { Loader2 } from 'lucide-react';

export const EFDesignerPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const { currentSessionId, setCurrentSessionId } = useEFDStore();
  const createSession = useCreateEFDSession();
  
  const activeSessionId = sessionIdParam || currentSessionId;
  const { data: session, isLoading: sessionLoading } = useEFDSession(activeSessionId);

  useEffect(() => {
    // If we have a session ID in URL, use it
    if (sessionIdParam && sessionIdParam !== currentSessionId) {
      setCurrentSessionId(sessionIdParam);
    }
  }, [sessionIdParam, currentSessionId, setCurrentSessionId]);

  const handleNewSession = async () => {
    const newSession = await createSession.mutateAsync();
    setSearchParams({ sessionId: newSession.id });
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Welcome to EF Designer</h2>
            <p className="text-muted-foreground max-w-md">
              Create SAFe-compliant Epics and Features from your requirements documents or text.
            </p>
            <button
              onClick={handleNewSession}
              disabled={createSession.isPending}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Start New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EFDesignerPage;
