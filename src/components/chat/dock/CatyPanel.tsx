/**
 * CatyPanel — Rovo-inspired AI assistant panel inside the ChatDock.
 * Lives alongside the existing Messages mode (dual-mode dock).
 *
 * Architecture:
 *  - Welcome state: greeting + PROMPT OF THE DAY + 3 suggestion chips
 *  - Conversation state: message thread + streaming response
 *  - Assistant picker: overlay with 7 role-gated assistants
 *  - Story Assistant: wires to `ai-generate-stories` edge function
 *  - General/other assistants: `caty-chat` edge function (Gemini)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Spinner from '@atlaskit/spinner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import catalystChatIcon from '@/assets/catalyst-chat-icon.svg';
import {
  CATY_ASSISTANTS,
  canUseAssistant,
  getDailyPrompt,
  type AssistantId,
  type CatyAssistant,
} from '@/lib/caty-assistants';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
// ads-scanner:ignore-next-line — caty-panel.css uses ADS tokens only
import './caty-panel.css';

// ─── Types ────────────────────────────────────────────────────────────

interface GeneratedStory {
  title: string;
  userStory: string;
  acceptanceCriteria: string[];
  brdRef?: string;
  covers?: string[];
}

interface CatyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  stories?: GeneratedStory[];
  epicKey?: string;
  coveragePercent?: number;
}

interface CatyPanelProps {
  onNewConversation?: () => void;
}

// ─── Epic key detector ─────────────────────────────────────────────────
const EPIC_KEY_RE = /\b([A-Z]{2,10}-\d+)\b/;

function extractEpicKey(text: string): string | null {
  return text.match(EPIC_KEY_RE)?.[1] ?? null;
}

// ─── Suggestion icon (chat bubble square — matches Rovo's icon style) ─
function SuggestionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6l-4 3V6a2 2 0 0 1 2-2Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <polyline points="5 12 12 5 19 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Assistant icon ───────────────────────────────────────────────────

function AssistantIcon({ assistant }: { assistant: CatyAssistant }) {
  if (!assistant.iconType) {
    return (
      <img src={catalystChatIcon} alt="" width={20} height={20} />
    );
  }
  return (
    <JiraIssueTypeIcon type={assistant.iconType as any} size={20} />
  );
}

// ─── Story card ───────────────────────────────────────────────────────

function StoryCard({
  story,
  index,
  epicKey,
  onAccept,
  onDismiss,
}: {
  story: GeneratedStory;
  index: number;
  epicKey: string;
  onAccept: (story: GeneratedStory) => void;
  onDismiss: (index: number) => void;
}) {
  return (
    <div className="cp-story-card">
      <div className="cp-story-card__title">
        <JiraIssueTypeIcon type="Story" size={14} />
        {' '}{story.title}
      </div>
      <div className="cp-story-card__body">{story.userStory}</div>
      <div className="cp-story-card__actions">
        <button
          type="button"
          style={{
            padding: '4px 10px',
            background: 'var(--ds-background-brand-bold, #0C66E4)',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => onAccept(story)}
        >
          Accept &amp; create
        </button>
        <button
          type="button"
          style={{
            padding: '4px 10px',
            background: 'transparent',
            color: 'var(--ds-text-subtle, #44546F)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
          }}
          onClick={() => onDismiss(index)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────

export function CatyPanel({ onNewConversation }: CatyPanelProps) {
  const { user } = useAuth();
  const { role, productRoles } = useUserRole();

  // User display name from profiles
  const { data: profile } = useQuery({
    queryKey: ['caty-profile-name', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const firstName = profile?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'there';

  const [activeId, setActiveId] = useState<AssistantId>('general');
  const [messages, setMessages] = useState<CatyMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  // Story flow: pending stories from breakdown
  const [pendingStories, setPendingStories] = useState<GeneratedStory[]>([]);
  const [pendingEpicKey, setPendingEpicKey] = useState('');
  // Epic input for Story Assistant welcome state
  const [epicInput, setEpicInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeAssistant = CATY_ASSISTANTS.find((a) => a.id === activeId)!;
  const canUse = canUseAssistant(activeAssistant, role, productRoles);
  const dailyPrompt = getDailyPrompt(activeAssistant);
  const isWelcome = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const addMessage = useCallback((msg: Omit<CatyMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<CatyMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // ── Story breakdown ──────────────────────────────────────────────────
  const runStoryBreakdown = useCallback(async (epicKey: string, sourceMessage?: string) => {
    const userMsgId = addMessage({
      role: 'user',
      content: sourceMessage ?? `Break down ${epicKey} into stories`,
    });

    const loadingId = addMessage({
      role: 'assistant',
      content: '',
      isLoading: true,
    });

    setLoading(true);

    try {
      // Fetch epic details for the prompt
      const { data: epicRow } = await supabase
        .from('ph_issues')
        .select('summary, description')
        .eq('issue_key', epicKey)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke('ai-generate-stories', {
        body: {
          epic_key: epicKey,
          epic_summary: epicRow?.summary ?? epicKey,
          description_text: epicRow?.description ?? '',
          selected_sources: epicRow?.description ? ['description'] : [],
        },
      });

      if (error || data?.error) {
        updateMessage(loadingId, {
          isLoading: false,
          content: data?.error ?? 'Failed to generate stories. Please try again.',
        });
        return;
      }

      const stories: GeneratedStory[] = data.stories ?? [];
      updateMessage(loadingId, {
        isLoading: false,
        content: stories.length > 0
          ? `Generated ${stories.length} stories for ${epicKey} (${data.coveragePercent ?? 0}% coverage):`
          : 'No stories could be generated. Add a description or attach documentation to the epic first.',
        stories: stories.length > 0 ? stories : undefined,
        epicKey,
        coveragePercent: data.coveragePercent,
      });

      if (stories.length > 0) {
        setPendingStories(stories);
        setPendingEpicKey(epicKey);
      }
    } catch {
      updateMessage(loadingId, {
        isLoading: false,
        content: 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [addMessage, updateMessage]);

  // ── General chat ─────────────────────────────────────────────────────
  const runGeneralChat = useCallback(async (text: string) => {
    addMessage({ role: 'user', content: text });
    const loadingId = addMessage({ role: 'assistant', content: '', isLoading: true });
    setLoading(true);

    try {
      const history = messages
        .filter((m) => !m.isLoading && m.content)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('caty-chat', {
        body: {
          assistant_id: activeId,
          message: text,
          history,
          user_name: firstName,
        },
      });

      updateMessage(loadingId, {
        isLoading: false,
        content: error ? 'Caty is unavailable. Try again shortly.' : (data?.response ?? 'No response.'),
      });
    } catch {
      updateMessage(loadingId, { isLoading: false, content: 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }, [messages, activeId, firstName, addMessage, updateMessage]);

  // ── Send handler ─────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading || !canUse) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (activeId === 'story') {
      const epicKey = extractEpicKey(text);
      if (epicKey) {
        runStoryBreakdown(epicKey, text);
      } else {
        addMessage({ role: 'user', content: text });
        addMessage({
          role: 'assistant',
          content: 'Please include an epic key (e.g. BAU-45) in your message to start the story breakdown.',
        });
      }
    } else {
      runGeneralChat(text);
    }
  }, [input, loading, canUse, activeId, runStoryBreakdown, runGeneralChat, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    if (activeId === 'story') {
      const epicKey = extractEpicKey(text);
      if (epicKey) {
        runStoryBreakdown(epicKey, text);
        return;
      }
    }
    setInput(text);
    textareaRef.current?.focus();
  };

  const handleEpicBreakdown = () => {
    const key = epicInput.trim().toUpperCase();
    if (!key) return;
    setEpicInput('');
    runStoryBreakdown(key);
  };

  const handleAcceptStory = async (story: GeneratedStory) => {
    if (!pendingEpicKey) return;
    try {
      // Create story in ph_issues attached to the epic
      await supabase.from('ph_issues').insert({
        issue_type: 'Story',
        summary: story.title,
        description: `${story.userStory}\n\nAcceptance Criteria:\n${story.acceptanceCriteria.map((ac) => `- ${ac}`).join('\n')}`,
        parent_key: pendingEpicKey,
        project_key: pendingEpicKey.split('-')[0],
        status: 'To Do',
        status_category: 'new',
      });
      addMessage({
        role: 'assistant',
        content: `✓ Story "${story.title}" created and attached to ${pendingEpicKey}.`,
      });
      // Remove from pending
      setPendingStories((prev) => prev.filter((s) => s.title !== story.title));
    } catch {
      addMessage({ role: 'assistant', content: 'Failed to create the story. Please try again.' });
    }
  };

  const handleAttachAll = async () => {
    if (!pendingEpicKey || pendingStories.length === 0) return;
    const epicKey = pendingEpicKey;
    const stories = [...pendingStories];
    setPendingStories([]);
    let created = 0;
    for (const story of stories) {
      try {
        await supabase.from('ph_issues').insert({
          issue_type: 'Story',
          summary: story.title,
          description: `${story.userStory}\n\nAcceptance Criteria:\n${story.acceptanceCriteria.map((ac) => `- ${ac}`).join('\n')}`,
          parent_key: epicKey,
          project_key: epicKey.split('-')[0],
          status: 'To Do',
          status_category: 'new',
        });
        created++;
      } catch {
        // skip failed stories
      }
    }
    addMessage({
      role: 'assistant',
      content: `✓ Created ${created} of ${stories.length} stories and attached them to ${epicKey}.`,
    });
  };

  const handleNewConversation = () => {
    setMessages([]);
    setInput('');
    setPendingStories([]);
    setPendingEpicKey('');
    onNewConversation?.();
  };

  const switchAssistant = (id: AssistantId, unlocked: boolean) => {
    if (!unlocked) return;
    setActiveId(id);
    setShowPicker(false);
    setMessages([]);
    setInput('');
    setPendingStories([]);
  };

  // ── Assistant picker overlay ──────────────────────────────────────────
  if (showPicker) {
    return (
      <div className="cp-picker">
        <div className="cp-picker__header">Switch assistant</div>
        <div className="cp-picker__list">
          {CATY_ASSISTANTS.map((a) => {
            const unlocked = canUseAssistant(a, role, productRoles);
            const isActive = a.id === activeId;
            return (
              <button
                key={a.id}
                type="button"
                className={`cp-picker__row${isActive ? ' cp-picker__row--active' : ''}${!unlocked ? ' cp-picker__row--locked' : ''}`}
                onClick={() => switchAssistant(a.id, unlocked)}
                title={unlocked ? a.tagline : a.lockedMessage}
              >
                <span
                  className="cp-picker__icon"
                  style={{ background: unlocked ? a.accentToken.replace('var(', '').split(',')[1]?.trim().slice(0, -1) ?? 'var(--ds-background-neutral, #F1F2F4)' : 'var(--ds-background-neutral, #F1F2F4)' }}
                >
                  <AssistantIcon assistant={a} />
                </span>
                <span className="cp-picker__name">{a.name}</span>
                {isActive && <span className="cp-picker__check"><CheckIcon /></span>}
                {!unlocked && <span className="cp-picker__lock"><LockIcon /></span>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="cp-picker__back"
          onClick={() => setShowPicker(false)}
        >
          ← Back to conversation
        </button>
      </div>
    );
  }

  // ── Locked state ──────────────────────────────────────────────────────
  const lockedPanel = !canUse ? (
    <>
      <div className="cp-locked">
        <div className="cp-locked__icon"><LockIcon /></div>
        <div className="cp-locked__title">{activeAssistant.name} is restricted</div>
        <div className="cp-locked__body">{activeAssistant.lockedMessage}</div>
        <button
          type="button"
          style={{
            padding: '6px 16px',
            background: 'var(--ds-background-brand-bold, #0C66E4)',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            border: 'none',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 8,
          }}
          onClick={() => setShowPicker(true)}
        >
          Switch assistant
        </button>
      </div>
    </>
  ) : null;

  return (
    <>
      {/* Sub-header: hamburger · "Ask Caty · [Name] ∨" */}
      <div className="cp-sub-header">
        <button
          type="button"
          className="cp-sub-header__history-btn"
          aria-label="Conversation history"
          title="Conversation history"
        >
          <HamburgerIcon />
        </button>
        <button
          type="button"
          className="cp-assistant-trigger"
          aria-label="Switch assistant"
          onClick={() => setShowPicker(true)}
        >
          <AssistantIcon assistant={activeAssistant} />
          <span className="cp-assistant-trigger__label">Ask Caty</span>
          {activeAssistant.id !== 'general' && (
            <span className="cp-assistant-trigger__sub">· {activeAssistant.name}</span>
          )}
          <span className="cp-assistant-trigger__chevron"><ChevronDownIcon /></span>
        </button>
        <button
          type="button"
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ds-text-subtle, #44546F)',
            borderRadius: 4,
            flex: '0 0 auto',
          }}
          aria-label="New conversation"
          title="New conversation"
          onClick={handleNewConversation}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Locked state */}
      {lockedPanel}

      {/* Welcome state */}
      {!lockedPanel && isWelcome && (
        <div className="cp-welcome">
          {/* Hero: Caty icon + speech bubble overlay */}
          <div className="cp-welcome__hero">
            <img src={catalystChatIcon} alt="" className="cp-welcome__hero-icon" />
            <div className="cp-welcome__bubble">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6l-4 3V6a2 2 0 0 1 2-2Z"
                  fill="var(--ds-text-subtlest, #6B778C)" />
              </svg>
            </div>
          </div>

          <div className="cp-greeting">How can I help, {firstName}?</div>

          {/* Story Assistant: show epic input as primary CTA */}
          {activeAssistant.id === 'story' ? (
            <div className="cp-epic-prompt" style={{ width: '100%', marginBottom: 16 }}>
              <div className="cp-epic-prompt__label">Break down an epic into stories</div>
              <div className="cp-epic-prompt__hint">
                Enter an epic key to generate stories from its description and attached documents.
              </div>
              <div className="cp-epic-prompt__row">
                <input
                  className="cp-epic-prompt__input"
                  placeholder="Epic key, e.g. BAU-45"
                  value={epicInput}
                  onChange={(e) => setEpicInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEpicBreakdown(); }}
                />
                <button
                  type="button"
                  className="cp-epic-prompt__btn"
                  disabled={!epicInput.trim() || loading}
                  onClick={handleEpicBreakdown}
                >
                  {loading ? <Spinner size="small" /> : 'Break down'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* PROMPT OF THE DAY */}
              <button
                type="button"
                className="cp-potd"
                onClick={() => handleSuggestion(dailyPrompt)}
              >
                <span className="cp-potd__icon-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <polyline points="16 16 12 12 8 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="12" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="cp-potd__content">
                  <span className="cp-potd__badge">Prompt of the day</span>
                  <span className="cp-potd__text">{dailyPrompt}</span>
                </span>
              </button>

              {/* Suggestion chips */}
              <div className="cp-suggestions">
                {activeAssistant.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="cp-suggestion"
                    onClick={() => handleSuggestion(s)}
                  >
                    <span className="cp-suggestion__icon-box"><SuggestionIcon /></span>
                    <span className="cp-suggestion__text">{s}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Conversation */}
      {!lockedPanel && !isWelcome && (
        <div className="cp-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`cp-msg cp-msg--${msg.role}`}>
              {msg.role === 'user' ? (
                <div className="cp-msg__bubble--user">{msg.content}</div>
              ) : msg.isLoading ? (
                <div className="cp-typing">
                  <img src={catalystChatIcon} alt="" className="cp-msg__ai-avatar" />
                  <div className="cp-typing__dots">
                    <div className="cp-typing__dot" />
                    <div className="cp-typing__dot" />
                    <div className="cp-typing__dot" />
                  </div>
                </div>
              ) : (
                <div className="cp-msg__ai-row">
                  <img src={catalystChatIcon} alt="" className="cp-msg__ai-avatar" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cp-msg__bubble--ai">{msg.content}</div>
                    {/* Story cards */}
                    {msg.stories && msg.stories.length > 0 && (
                      <div className="cp-story-cards" style={{ marginTop: 8 }}>
                        {msg.stories.map((story, i) => (
                          <StoryCard
                            key={i}
                            story={story}
                            index={i}
                            epicKey={msg.epicKey ?? ''}
                            onAccept={handleAcceptStory}
                            onDismiss={(idx) => {
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === msg.id
                                    ? { ...m, stories: m.stories?.filter((_, si) => si !== idx) }
                                    : m,
                                ),
                              );
                              setPendingStories((prev) => prev.filter((_, si) => si !== idx));
                            }}
                          />
                        ))}
                        {msg.stories.length > 1 && (
                          <button
                            type="button"
                            className="cp-story-cards__attach-all"
                            onClick={handleAttachAll}
                          >
                            Attach all {msg.stories.length} stories to {msg.epicKey}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area */}
      {!lockedPanel && (
        <div className="cp-input-area">
          <div className="cp-input-box">
            <textarea
              ref={textareaRef}
              className="cp-input-box__textarea"
              placeholder={
                activeAssistant.id === 'story'
                  ? 'Enter an epic key (e.g. BAU-45) or ask a story question…'
                  : 'Ask Caty, @mention, or /commands'
              }
              value={input}
              rows={1}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <div className="cp-input-toolbar">
            <span className="cp-input-toolbar__spacer" />
            <button
              type="button"
              className={`cp-send-btn${input.trim() && !loading ? ' cp-send-btn--active' : loading ? ' cp-send-btn--loading' : ''}`}
              aria-label="Send message"
              onClick={handleSend}
              disabled={!input.trim() || loading}
            >
              {loading ? <Spinner size="small" /> : <SendIcon />}
            </button>
          </div>
        </div>
      )}

      {/* Trust footer — always visible (mirrors Rovo "Uses AI. Verify results.") */}
      {!lockedPanel && (
        <div className="cp-footer">
          ⓘ Caty uses Catalyst data only. Responses are contextual.
        </div>
      )}
    </>
  );
}

export default CatyPanel;
