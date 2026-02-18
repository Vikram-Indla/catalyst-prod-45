/**
 * VisionBanner — Premium "Boardroom Statement" hero component
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
  return `Updated ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

/** Skeleton loader matching banner dimensions */
function VisionSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        minHeight: '80px',
        background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 40%, #2563EB 100%)',
        padding: '20px 28px',
      }}
    >
      {/* Shimmer animation */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <div style={{ height: 10, width: 140, background: 'rgba(255,255,255,0.15)', borderRadius: 4, marginBottom: 10 }} />
      <div style={{ height: 20, width: '60%', background: 'rgba(255,255,255,0.15)', borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 16, width: 100, background: 'rgba(255,255,255,0.1)', borderRadius: 999 }} />

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
      className="relative overflow-hidden rounded-xl flex items-center justify-center gap-3"
      style={{
        minHeight: '80px',
        background: 'linear-gradient(135deg, #64748B 0%, #94A3B8 100%)',
        padding: '20px 28px',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Unable to load vision</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          color: 'rgba(255,255,255,0.8)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'underline',
        }}
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

/** Empty state for when no vision exists */
function VisionEmpty({ isOwner, onDefine }: { isOwner: boolean; onDefine: () => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl flex items-center justify-center"
      role="banner"
      aria-label="Organizational vision statement"
      style={{
        minHeight: '80px',
        background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 40%, #2563EB 100%)',
        padding: '20px 28px',
      }}
    >
      {/* Gold accent */}
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: '#F59E0B' }} />
      {/* Pattern overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="flex flex-col items-center gap-2 relative z-10">
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
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
              fontSize: 13,
              fontWeight: 500,
              padding: '4px 14px',
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

  if (loading) return <div style={{ margin: '0 0 16px' }}><VisionSkeleton /></div>;
  if (error) return <div style={{ margin: '0 0 16px' }}><VisionError onRetry={refetch} /></div>;
  if (!vision) return <div style={{ margin: '0 0 16px' }}><VisionEmpty isOwner={isOwner} onDefine={startEdit} /></div>;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="relative overflow-hidden rounded-xl group"
        role="banner"
        aria-label="Organizational vision statement"
        style={{
          minHeight: '80px',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 40%, #2563EB 100%)',
          transition: 'box-shadow 300ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(30, 58, 138, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Gold left accent stripe */}
        <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: '#F59E0B' }} />

        {/* Subtle geometric pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Content */}
        <div
          className="relative z-10 flex items-start justify-between"
          style={{ padding: '20px 28px' }}
        >
          {/* Left section */}
          <div className="flex-1 min-w-0">
            {/* Label row */}
            <div
              className="hidden lg:block"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              ORGANIZATIONAL VISION
            </div>

            {editing ? (
              /* ── Edit Mode ── */
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Vision statement"
                  disabled={saving}
                  className="w-full focus:outline-none"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#1E3A8A',
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    border: 'none',
                    lineHeight: 1.4,
                  }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={saveVision}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
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
                    <Check size={12} /> Save Vision
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.7)',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ── Display Mode ── */
              <>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: 1.4,
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                >
                  {vision.title}
                </div>
                {vision.target_year && (
                  <div
                    className="inline-flex items-center gap-1 mt-2"
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.8)',
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: 999,
                      padding: '2px 10px',
                    }}
                  >
                    🎯 Target: {vision.target_year}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right section */}
          {!editing && (
            <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
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
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FFFFFF';
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
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                {formatUpdatedAt(vision.updated_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
