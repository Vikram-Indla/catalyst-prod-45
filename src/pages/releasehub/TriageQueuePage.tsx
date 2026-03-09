import React from 'react';
import { useTriageCount, useChanges } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { ChgStatusBadge } from '@/components/releasehub/ChgStatusBadge';
import { CatalystAIChip } from '@/components/releasehub/CatalystAIChip';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState } from '@/components/releasehub/EmptyState';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function TriageQueuePage() {
  const { data: triageCount = 0 } = useTriageCount();
  const { data: changes = [], isLoading } = useChanges();
  const unlinked = changes.filter((c: any) => !c.release_id);

  return (
    <div className="rh-page">
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Triage Queue</h1>
        <p className="text-[13px] text-[#64748B]" style={{ fontFamily: RH.fontBody }}>Unassigned changes awaiting release assignment</p>
      </div>

      {triageCount > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-[#C2840A]" />
          <span className="text-[13px] font-semibold text-[#92400E]">{triageCount} change{triageCount !== 1 ? 's' : ''} ha{triageCount !== 1 ? 've' : 's'} no release assignment</span>
        </div>
      )}

      {isLoading ? (
        <SkeletonRows count={5} />
      ) : unlinked.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 flex flex-col items-center gap-2">
          <CheckCircle size={24} className="text-[#15803D]" />
          <span className="text-[14px] font-bold text-[#15803D]" style={{ fontFamily: RH.fontDisplay }}>No unlinked work items — pipeline is clean ✓</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
            <thead>
              <tr className="bg-[#F4F7FA] border-b border-[#E2E8F0]">
                {['CHG', 'TITLE', 'STATUS', 'RISK', 'CATEGORY', 'PLANNED'].map(h => (
                  <th key={h} scope="col" className="px-3 py-0 h-9 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unlinked.map((c: any) => (
                <tr key={c.id} className="border-b border-[#F1F5F9] hover:bg-[#F4F7FA] h-9" style={{ transition: 'background 80ms ease' }}>
                  <td className="px-3 py-0 font-bold text-[#0D9488]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</td>
                  <td className="px-3 py-0 truncate max-w-[280px]" title={c.title} style={{ color: RH.ink2 }}>{c.title}</td>
                  <td className="px-3 py-0"><ChgStatusBadge status={c.status} /></td>
                  <td className="px-3 py-0"><span className="text-[10px] font-bold uppercase">{c.risk_level}</span></td>
                  <td className="px-3 py-0 text-[#64748B]">{c.category || <span className="text-[#94A3B8]">—</span>}</td>
                  <td className="px-3 py-0 text-[#64748B]">{c.deployment_date ? new Date(c.deployment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : <span className="text-[#94A3B8]">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {unlinked.some((c: any) => c.status === 'in_uat' || c.status === 'in_beta') && (
            <div className="px-4 py-3 border-t border-[#E2E8F0]">
              <CatalystAIChip label={`${unlinked.filter((c: any) => c.status === 'in_uat' || c.status === 'in_beta').length} items are at risk of blocking Beta deployment — review`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
