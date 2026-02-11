import { useState, useEffect } from 'react';
import { Plus, History, Brain, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatyAIChat } from '@/components/caty-ai-chat/CatyAIChat';
import { CatyAIHistorySidebar } from '@/components/caty-ai-chat/CatyAIHistorySidebar';
import { CatyGenerateTestsModal } from '@/components/caty-ai-chat/CatyGenerateTestsModal';
import { CatyAICoverageAnalysis } from '@/components/caty-ai-chat/CatyAICoverageAnalysis';
import { CatyAIQueryPanel } from '@/components/caty-ai-chat/CatyAIQueryPanel';
import { useCatyConversations, useCreateCatyConversation } from '@/hooks/useCatyAI';
import { useAuth } from '@/lib/auth';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export default function CatyAIPage() {
  const { user } = useAuth();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  const { data: conversations } = useCatyConversations(user?.id || '', DEFAULT_PROJECT_ID);
  const createConversation = useCreateCatyConversation();

  useEffect(() => {
    if (!activeConvId && conversations?.length) setActiveConvId(conversations[0].id);
  }, [conversations, activeConvId]);

  const handleNewChat = async () => {
    if (!user) return;
    const conv = await createConversation.mutateAsync({ userId: user.id, projectId: DEFAULT_PROJECT_ID });
    setActiveConvId(conv.id);
    setActiveTab('chat');
  };

  const handleQuickAction = (action: string) => {
    if (action === 'generate') setShowGenerateModal(true);
    else if (action === 'coverage') setActiveTab('coverage');
    else if (action === 'query') setActiveTab('query');
    else if (action === 'prioritize' && activeConvId) {
      setActiveTab('chat');
      sendPrioritizeMessage(activeConvId);
    }
  };

  const sendPrioritizeMessage = async (convId: string) => {
    // Trigger a prioritize question in the current chat
    const sendMsg = document.querySelector<HTMLTextAreaElement>('[data-caty-input]');
    if (sendMsg) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(sendMsg, 'Prioritize my test cases by risk. Which tests should I run first?');
      sendMsg.dispatchEvent(new Event('input', { bubbles: true }));
      // Auto-submit after a tick
      setTimeout(() => sendMsg.form?.requestSubmit(), 100);
    }
  };

  return (
    <div className="flex h-full">
      {showHistory && (
        <CatyAIHistorySidebar conversations={conversations || []} activeId={activeConvId}
          onSelect={(id) => { setActiveConvId(id); setActiveTab('chat'); }} onClose={() => setShowHistory(false)} />
      )}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500"><Brain className="h-5 w-5 text-white" /></div>
            <div><h1 className="font-semibold text-foreground">CATY AI</h1><p className="text-xs text-muted-foreground">Your AI Testing Partner</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleNewChat}><Plus className="h-4 w-4 mr-1" />New Chat</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}><History className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" title="Settings"><Settings className="h-4 w-4" /></Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 w-fit">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="coverage">Coverage</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="flex-1 min-h-0">
            {activeConvId ? (
              <CatyAIChat conversationId={activeConvId} onQuickAction={handleQuickAction} />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <Button onClick={handleNewChat}><Plus className="h-4 w-4 mr-2" />Start New Conversation</Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="coverage" className="flex-1 overflow-auto p-6">
            <CatyAICoverageAnalysis projectId={DEFAULT_PROJECT_ID} onGenerateFromGap={() => setShowGenerateModal(true)} />
          </TabsContent>
          <TabsContent value="query" className="flex-1 overflow-auto p-6">
            <CatyAIQueryPanel projectId={DEFAULT_PROJECT_ID} />
          </TabsContent>
        </Tabs>
      </div>

      <CatyGenerateTestsModal open={showGenerateModal} onClose={() => setShowGenerateModal(false)} projectId={DEFAULT_PROJECT_ID} />
    </div>
  );
}
