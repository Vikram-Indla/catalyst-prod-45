/**
 * VisionBanner — Compact "Boardroom Statement" hero component
 * Fetches active vision from es_visions table.
 * Supports inline editing for Strategy Owners via es_strategy_roles RBAC.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Check, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

interface VisionData {
  id: string;
  title: string;
  target_year: number | null;
  updated_at: string;
}

function useActiveVision() {
  const [vision, setVision] = useState<VisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: err } = await supabase
        .from('es_visions')
        .select('id, title, target_year, updated_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (err) throw err;
      setVision(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { vision, loading, error, refetch: fetch, setVision };
}

function useStrategyRole() {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('es_strategy_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'strategy_owner')
        .maybeSingle();
      setIsOwner(!!data);
    })();
  }, []);

  return { isOwner };
}

function formatUpdatedAt(dateStr: string): string {
  const d = new Date(dateStr);
  return `Last edited ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

/** Skeleton loader */
function VisionSkeleton() {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        minHeight: '56px',
        background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #2563EB 100%)',
        borderRadius: 'var(--catalyst-radius-xl, 12px)',
        borderLeft: '3px solid #F59E0B',
        padding: '12px 20px',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <div className="flex items-center gap-4">
        <div style={{ height: 10, width: 140, background: 'rgba(255,255,255,0.15)', borderRadius: 4 }} />
        <div style={{ height: 16, width: '40%', background: 'rgba(255,255,255,0.15)', borderRadius: 4 }} />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/** Error state */
function VisionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="relative overflow-hidden flex items-center justify-center gap-3"
      style={{
        minHeight: '56px',
        background: 'linear-gradient(135deg, #64748B 0%, #94A3B8 100%)',
        borderRadius: 'var(--catalyst-radius-xl, 12px)',
        borderLeft: '3px solid #F59E0B',
        padding: '12px 20px',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Unable to load vision</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          color: 'rgba(255,255,255,0.8)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          textDecoration: 'underline',
        }}
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

/** Empty state */
function VisionEmpty({ isOwner, onDefine }: { isOwner: boolean; onDefine: () => void }) {
  return (
    <div
      className="vision-banner relative overflow-hidden flex items-center"
      role="banner"
      aria-label="Organizational vision statement"
      style={{
        minHeight: '56px',
        background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #2563EB 100%)',
        borderRadius: 'var(--catalyst-radius-xl, 12px)',
        borderLeft: '3px solid #F59E0B',
        padding: '12px 20px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)',
      }}
    >
      <div className="vision-pattern absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />
      <div className="flex items-center gap-3 relative z-10">
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
          Set your organizational vision
        </span>
        {isOwner && (
          <button
            onClick={onDefine}
            className="flex items-center gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              color: '#FFFFFF',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              padding: '3px 12px',
              borderRadius: 6,
            }}
          >
            Define Vision →
          </button>
        )}
      </div>
    </div>
  );
}

export function VisionBanner() {
  const { vision, loading, error, refetch, setVision } = useActiveVision();
  const { isOwner } = useStrategyRole();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setEditValue(vision?.title ?? '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [vision]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditValue('');
  }, []);

  const saveVision = useCallback(async () => {
    if (!vision || !editValue.trim() || editValue.trim() === vision.title) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from('es_visions')
        .update({ title: editValue.trim(), updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', vision.id);
      if (err) throw err;
      setVision({ ...vision, title: editValue.trim(), updated_at: new Date().toISOString() });
      setEditing(false);
      catalystToast.success('Vision statement updated');
    } catch {
      catalystToast.error('Failed to update vision');
    } finally {
      setSaving(false);
    }
  }, [vision, editValue, cancelEdit, setVision]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveVision(); }
    if (e.key === 'Escape') cancelEdit();
  }, [saveVision, cancelEdit]);

  if (loading) return <div style={{ marginBottom: 16 }}><VisionSkeleton /></div>;
  if (error) return <div style={{ marginBottom: 16 }}><VisionError onRetry={refetch} /></div>;
  if (!vision) return <div style={{ marginBottom: 16 }}><VisionEmpty isOwner={isOwner} onDefine={startEdit} /></div>;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="vision-banner relative overflow-hidden group"
        role="banner"
        aria-label="Organizational vision statement"
        style={{
          minHeight: '56px',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #2563EB 100%)',
          borderRadius: 'var(--catalyst-radius-xl, 12px)',
          borderLeft: '3px solid #F59E0B',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)',
          transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(30, 58, 138, 0.25), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)';
        }}
      >
        {/* Geometric pattern overlay */}
        <div className="vision-pattern absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />

        {/* Content — single row */}
        <div
          className="relative z-10 flex items-center"
          style={{ padding: '12px 20px' }}
        >
          {/* Label */}
          <span
            className="hidden lg:inline shrink-0"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginRight: 16,
            }}
          >
            ORGANIZATIONAL VISION
          </span>

          {editing ? (
            /* ── Edit Mode ── */
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Vision statement"
                disabled={saving}
                className="flex-1 min-w-0 focus:outline-none"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1E3A8A',
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: 8,
                  padding: '8px 14px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  border: 'none',
                  lineHeight: 1.4,
                }}
              />
              <button
                onClick={saveVision}
                disabled={saving}
                className="flex items-center gap-1 rounded-md shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#1D4ED8',
                  background: '#FFFFFF',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                <Check size={12} /> Save
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1 rounded-md shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.7)',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
              >
                <X size={12} /> Cancel
              </button>
            </div>
          ) : (
            /* ── Display Mode — single row ── */
            <>
              <span
                className="flex-1 min-w-0 truncate"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  lineHeight: 1.4,
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              >
                {vision.title}
              </span>

              {/* Right side: target badge + updated + edit */}
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {vision.target_year && (
                  <span
                    className="inline-flex items-center"
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.7)',
                      background: 'rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: 9999,
                      padding: '2px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ◎ {vision.target_year}
                  </span>
                )}
                <span
                  className="hidden md:inline"
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.4)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatUpdatedAt(vision.updated_at)}
                </span>
                {isOwner && (
                  <button
                    onClick={startEdit}
                    aria-label="Edit vision statement"
                    className="focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 4,
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,1)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .vision-pattern::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 16px 16px;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}
