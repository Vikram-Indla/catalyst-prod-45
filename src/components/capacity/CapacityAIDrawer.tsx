/**
 * Capacity AI Drawer - Chat-based AI assistant for capacity planning
 * Matches the exact design from the reference screenshot
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Send, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface CapacityAIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'available', label: 'Available' },
  { id: 'risks', label: 'Risks' },
  { id: 'find-backend', label: 'Find Backend' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'forecast', label: 'Forecast' },
];

// Mock AI responses for different queries
const getMockResponse = (query: string): string => {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('summary') || lowerQuery.includes('executive')) {
    return `**Capacity Summary**\n\n• **Total Resources:** 24 team members\n• **Average Utilization:** 78%\n• **Over-allocated:** 3 resources (12.5%)\n• **Under-utilized:** 5 resources (20.8%)\n\n**Key Insights:**\n- Delivery team is running at 92% capacity\n- Product team has 15% available bandwidth\n- 2 critical projects need additional backend resources`;
  }
  
  if (lowerQuery.includes('available')) {
    return `**Available Resources**\n\n1. **Sarah Chen** - Frontend Developer\n   • Current: 60% allocated\n   • Available: 40% (16 hrs/week)\n\n2. **Mike Johnson** - DevOps Engineer\n   • Current: 50% allocated\n   • Available: 50% (20 hrs/week)\n\n3. **Emma Wilson** - QA Analyst\n   • Current: 45% allocated\n   • Available: 55% (22 hrs/week)\n\n*Would you like me to suggest assignments for these resources?*`;
  }
  
  if (lowerQuery.includes('risks') || lowerQuery.includes('risk')) {
    return `**Capacity Risks Identified**\n\n🔴 **Critical:**\n- Backend team over-allocated by 15% for next sprint\n- No backup for David (Sr. Architect) - single point of failure\n\n🟠 **High:**\n- Mobile team has 3 concurrent deadlines next week\n- QA capacity gap for Project Alpha release\n\n🟡 **Medium:**\n- 2 resources on PTO next month during critical phase\n\n*Shall I suggest mitigation strategies?*`;
  }
  
  if (lowerQuery.includes('backend') || lowerQuery.includes('find')) {
    return `**Backend Developers Available**\n\n1. **Alex Kumar** - Backend Developer\n   • Skills: Node.js, Python, PostgreSQL\n   • Available: 30% capacity\n   • Recommended for: API development\n\n2. **James Park** - Sr Backend Developer\n   • Skills: Java, Kubernetes, AWS\n   • Available: 25% capacity\n   • Recommended for: Infrastructure work\n\n*Would you like me to create an assignment proposal?*`;
  }
  
  if (lowerQuery.includes('optimize') || lowerQuery.includes('optimization')) {
    return `**Optimization Recommendations**\n\n1. **Rebalance Project Beta Team**\n   - Move 20% of Tom's allocation from Project Alpha\n   - Expected improvement: +15% velocity\n\n2. **Cross-train QA Resources**\n   - Emma can support mobile testing\n   - Reduces bottleneck risk by 40%\n\n3. **Stagger Sprint Starts**\n   - Offset by 3 days between teams\n   - Reduces peak load conflicts\n\n*Want me to apply any of these optimizations?*`;
  }
  
  if (lowerQuery.includes('forecast')) {
    return `**Capacity Forecast (Next 4 Weeks)**\n\n📊 **Week 1:** 82% utilized (Optimal)\n📊 **Week 2:** 91% utilized (At Risk)\n📊 **Week 3:** 95% utilized (Critical)\n📊 **Week 4:** 78% utilized (Optimal)\n\n**Projected Issues:**\n- Week 2-3: Backend team needs +2 contractors\n- Week 3: QA bottleneck expected\n\n**Recommendations:**\n- Bring in contract resources by Week 2\n- Shift non-critical work to Week 4\n\n*Need a detailed breakdown by team?*`;
  }
  
  return `I can help you with capacity planning. Here are some things I can do:\n\n• **Executive Summary** - Get a high-level view of team capacity\n• **Find Available Resources** - Identify team members with bandwidth\n• **Risk Analysis** - Spot potential capacity issues\n• **Optimization** - Get recommendations to improve utilization\n• **Forecasting** - Project future capacity needs\n\n*What would you like to explore?*`;
};

export function CapacityAIDrawer({ isOpen, onClose }: CapacityAIDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'I can help you analyze capacity, find resources, and optimize workloads.\n\nTry: "Executive summary" or "Optimize team"',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getMockResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 800);
  };

  const handleQuickAction = (actionId: string) => {
    const actionLabels: Record<string, string> = {
      'summary': 'Give me an executive summary of capacity',
      'available': 'Show me available resources',
      'risks': 'What are the capacity risks?',
      'find-backend': 'Find available backend developers',
      'optimize': 'How can I optimize the team?',
      'forecast': 'Forecast capacity for next month',
    };
    handleSend(actionLabels[actionId] || actionId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[99] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <aside
        className={cn(
          "fixed top-0 right-0 w-[420px] max-w-[90vw] h-screen z-[100]",
          "flex flex-col bg-[hsl(var(--card))] border-l border-[hsl(var(--border))]",
          "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Blue Gradient Header */}
        <header className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8]">
          <div className="flex items-center gap-3">
            {/* AI Icon */}
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Capacity AI</h2>
              <p className="text-[12px] text-white/70">Planning & optimization assistant</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-xl p-4",
                message.role === 'assistant'
                  ? "bg-[hsl(var(--muted))] mr-4"
                  : "bg-[#2563eb]/10 ml-4 border border-[#2563eb]/20"
              )}
            >
              {message.role === 'assistant' && (
                <p className="text-[13px] font-semibold text-[hsl(var(--foreground))] mb-2">
                  Capacity AI
                </p>
              )}
              <div className="text-[13px] text-[hsl(var(--foreground))] leading-relaxed whitespace-pre-wrap">
                {message.content.split('\n').map((line, i) => {
                  // Handle bold text
                  const boldPattern = /\*\*(.*?)\*\*/g;
                  const parts = line.split(boldPattern);
                  
                  return (
                    <p key={i} className={line === '' ? 'h-2' : undefined}>
                      {parts.map((part, j) => 
                        j % 2 === 1 ? (
                          <strong key={j} className="font-semibold">{part}</strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="bg-[hsl(var(--muted))] rounded-xl p-4 mr-4">
              <p className="text-[13px] font-semibold text-[hsl(var(--foreground))] mb-2">
                Capacity AI
              </p>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-5 py-3 border-t border-[hsl(var(--border))]">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                disabled={isLoading}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium rounded-full border transition-colors",
                  "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]",
                  "hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--foreground))/20]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-[hsl(var(--border))]">
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about capacity..."
              disabled={isLoading}
              className="pr-12 h-11 text-[13px] rounded-full border-[#2563eb]/30 focus:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                inputValue.trim() && !isLoading
                  ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
