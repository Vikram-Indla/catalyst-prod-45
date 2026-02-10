/**
 * ViewSharedStepModal — G2-06
 * Read-only view of a shared step with details, variables, and linked test cases.
 */

import { useState, useEffect, Fragment } from 'react';
import {
  X, Pencil, Trash2, Copy, Tag, Clock,
  Variable, Link2, CheckCircle, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTimestamp } from '@/lib/formatTimestamp';

interface SharedStepVariable {
  name: string;
  default?: string;
}

interface SharedStep {
  id: string;
  name: string;
  description: string | null;
  action: string;
  expected_result: string | null;
  category_id: string | null;
  variables: any;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; color: string; icon: string } | null;
}

interface LinkedTestCase {
  id: string;
  case_key: string;
  title: string;
}

interface ViewSharedStepModalProps {
  isOpen: boolean;
  sharedStep: SharedStep | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function highlightVariables(text: string) {
  if (!text) return null;
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
    if (part.match(/^\{\{[^}]+\}\}$/)) {
      return (
        <span key={i} style={{
          display: 'inline', padding: '1px 6px', backgroundColor: '#EFF6FF',
          color: '#2563EB', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
        }}>{part}</span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function ViewSharedStepModal({ isOpen, sharedStep, onClose, onEdit, onDelete, onDuplicate }: ViewSharedStepModalProps) {
  const [linkedTestCases, setLinkedTestCases] = useState<LinkedTestCase[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  useEffect(() => {
    if (isOpen && sharedStep) {
      setIsLoadingLinks(true);
      supabase
        .from('th_shared_step_usage')
        .select('test_case_id, test_case:th_test_cases (id, case_key, title)')
        .eq('shared_step_id', sharedStep.id)
        .limit(10)
        .then(({ data, error }) => {
          if (!error && data) {
            setLinkedTestCases(
              data.filter((d: any) => d.test_case).map((d: any) => ({
                id: d.test_case.id, case_key: d.test_case.case_key, title: d.test_case.title,
              }))
            );
          }
          setIsLoadingLinks(false);
        });
    } else {
      setLinkedTestCases([]);
    }
  }, [isOpen, sharedStep]);

  if (!isOpen || !sharedStep) return null;

  const vars: SharedStepVariable[] = Array.isArray(sharedStep.variables) ? sharedStep.variables : [];

  const iconBtn = (onClick: () => void, title: string, children: React.ReactNode, danger = false): React.ReactNode => (
    <button onClick={onClick} title={title} style={{
      width: 36, height: 36, padding: 0, border: '1px solid #E2E8F0', borderRadius: 8,
      backgroundColor: '#FFFFFF', color: danger ? '#DC2626' : '#64748B', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 680, maxHeight: '90vh', backgroundColor: '#FFFFFF', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {sharedStep.category && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  color: sharedStep.category.color,
                  backgroundColor: `${sharedStep.category.color}15`,
                  marginBottom: 8, fontFamily: 'Inter',
                }}>
                  <Tag size={12} />
                  {sharedStep.category.name}
                </span>
              )}
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'Inter' }}>
                {sharedStep.name}
              </h2>
              {sharedStep.description && (
                <p style={{ fontSize: 14, color: '#64748B', margin: '6px 0 0', fontFamily: 'Inter' }}>
                  {sharedStep.description}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
              {iconBtn(onEdit, 'Edit', <Pencil size={16} />)}
              {iconBtn(onDuplicate, 'Duplicate', <Copy size={16} />)}
              {iconBtn(onDelete, 'Delete', <Trash2 size={16} />, true)}
              {iconBtn(onClose, 'Close', <X size={16} />)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', fontFamily: 'Inter' }}>
              <CheckCircle size={14} style={{ color: '#0D9488' }} />
              Used {sharedStep.usage_count} times
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', fontFamily: 'Inter' }}>
              <Clock size={14} />
              Updated {formatTimestamp(sharedStep.updated_at)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Action */}
          <Section title="Action">
            <div style={{
              padding: 16, backgroundColor: '#F8FAFC', borderRadius: 8,
              fontSize: 14, color: '#334155', lineHeight: 1.7, fontFamily: 'Inter',
            }}>
              {highlightVariables(sharedStep.action)}
            </div>
          </Section>

          {/* Expected Result */}
          {sharedStep.expected_result && (
            <Section title="Expected Result">
              <div style={{
                padding: 16, backgroundColor: '#F0FDF4', borderRadius: 8,
                border: '1px solid #BBF7D0', fontSize: 14, color: '#166534', lineHeight: 1.7, fontFamily: 'Inter',
              }}>
                {highlightVariables(sharedStep.expected_result)}
              </div>
            </Section>
          )}

          {/* Variables */}
          {vars.length > 0 && (
            <Section title={`Variables (${vars.length})`} icon={<Variable size={16} style={{ color: '#2563EB' }} />}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {vars.map((v, i) => (
                  <div key={i} style={{
                    padding: '8px 14px', backgroundColor: '#F8FAFC', borderRadius: 8,
                    border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#2563EB',
                    }}>{`{{${v.name}}}`}</span>
                    {v.default && (
                      <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Inter' }}>
                        Default: {v.default}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Linked Test Cases */}
          <Section title="Linked Test Cases" icon={<Link2 size={16} style={{ color: '#64748B' }} />}>
            {isLoadingLinks ? (
              <p style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Inter' }}>Loading...</p>
            ) : linkedTestCases.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94A3B8', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 8, margin: 0, fontFamily: 'Inter' }}>
                This shared step is not used in any test cases yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {linkedTestCases.map(tc => (
                  <div key={tc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    backgroundColor: '#F8FAFC', borderRadius: 8,
                  }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#2563EB',
                      backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: 4,
                    }}>{tc.case_key}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#334155', fontFamily: 'Inter' }}>{tc.title}</span>
                    <ExternalLink size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                  </div>
                ))}
                {sharedStep.usage_count > linkedTestCases.length && (
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0', fontFamily: 'Inter' }}>
                    +{sharedStep.usage_count - linkedTestCases.length} more test cases
                  </p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            height: 40, padding: '0 20px', backgroundColor: '#FFFFFF',
            border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14,
            fontWeight: 500, color: '#334155', cursor: 'pointer', fontFamily: 'Inter',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter',
      }}>
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}
