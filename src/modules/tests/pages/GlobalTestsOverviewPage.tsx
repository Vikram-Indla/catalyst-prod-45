/**
 * GLOBAL TESTS OVERVIEW - ENTERPRISE RELEASE COMMAND CONSOLE
 * Catalyst V5 • Light Mode Only • Release-Based (NO SPRINTS)
 * Saudi Ministry of Industry - Mission-critical portfolio management
 */

import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Play,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGlobalTestMetrics, useGlobalTestCycles } from '../hooks/useGlobalTestMetrics';
import { useRecentTestActivity } from '../hooks/useRecentTestActivity';
import { useStoryCoverage } from '../hooks/useStoryCoverage';
import { ScopeType } from '../hooks/useGlobalTestScope';
import { RunTestsModal } from '../components/RunTestsModal';

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA - Enterprise release-based test executions
// ═══════════════════════════════════════════════════════════════════

const MOCK_EXECUTIONS = [
  { id: '1', name: 'Release 2.4 Regression', owner: null, fail: 4, block: 2, pass: 18, progress: 75, coverage: 62, due: 'Today', critical: true },
  { id: '2', name: 'Release 2.4 UAT', owner: null, fail: 3, block: 1, pass: 12, progress: 80, coverage: 71, due: 'Today', critical: true },
  { id: '3', name: 'Release 2.4 API Integration', owner: 'Ahmed K.', fail: 0, block: 1, pass: 24, progress: 96, coverage: 88, due: 'Tomorrow', critical: false },
  { id: '4', name: 'Release 2.3 Payment Gateway', owner: 'Sara M.', fail: 0, block: 0, pass: 31, progress: 100, coverage: 94, due: 'Dec 18', critical: false },
  { id: '5', name: 'Release 2.4 Performance', owner: 'Nour A.', fail: 0, block: 0, pass: 8, progress: 67, coverage: 75, due: 'Dec 19', critical: false },
  { id: '6', name: 'Release 2.3 Auth & Security', owner: 'Adnan T.', fail: 0, block: 0, pass: 19, progress: 100, coverage: 100, due: 'Complete', critical: false },
  { id: '7', name: 'Release 2.5 Mobile Responsive', owner: 'Layla H.', fail: 0, block: 0, pass: 0, progress: 0, coverage: 0, due: 'Dec 22', critical: false },
  { id: '8', name: 'Release 2.3 Report Generation', owner: 'Omar F.', fail: 0, block: 0, pass: 14, progress: 100, coverage: 92, due: 'Complete', critical: false },
];

const MOCK_ACTIVITY_LOG = [
  { id: '1', actor: 'Adnan T.', action: 'FAILED', entity: 'Verify user login', time: '2m ago' },
  { id: '2', actor: 'Sara M.', action: 'PASSED', entity: 'Payment flow test', time: '5m ago' },
  { id: '3', actor: 'Ahmed K.', action: 'MODIFIED', entity: 'API endpoint check', time: '12m ago' },
  { id: '4', actor: 'Nour A.', action: 'PASSED', entity: 'Dashboard load t...', time: '18m ago' },
  { id: '5', actor: 'Adnan T.', action: 'FAILED', entity: 'Password reset ...', time: '23m ago' },
  { id: '6', actor: 'Layla H.', action: 'CREATED', entity: 'Mobile nav test', time: '31m ago' },
  { id: '7', actor: 'Omar F.', action: 'PASSED', entity: 'PDF export check', time: '45m ago' },
  { id: '8', actor: 'Ahmed K.', action: 'MODIFIED', entity: 'Release 2.4 Regr...', time: '1h ago' },
  { id: '9', actor: 'Sara M.', action: 'PASSED', entity: 'Refund processing', time: '1h ago' },
  { id: '10', actor: 'Adnan T.', action: 'MODIFIED', entity: 'Auth test suite', time: '2h ago' },
  { id: '11', actor: 'Nour A.', action: 'CREATED', entity: 'Perf benchmark', time: '2h ago' },
  { id: '12', actor: 'Omar F.', action: 'PASSED', entity: 'Excel export test', time: '3h ago' },
];

// ═══════════════════════════════════════════════════════════════════
// PAGE HEADER - 44px, blue title, meta text, action buttons
// ═══════════════════════════════════════════════════════════════════

function PageHeader({ onResolve, onRunTests }: { onResolve: () => void; onRunTests: () => void }) {
  return (
    <div 
      className="flex items-center justify-between h-[44px] px-5 border-b"
      style={{ 
        backgroundColor: '#ffffff', 
        borderColor: '#e5e5e5' 
      }}
    >
      <div className="flex items-center gap-3">
        <h1 
          className="text-lg font-bold tracking-tight"
          style={{ 
            color: '#2563eb', 
            letterSpacing: '-0.02em',
            fontWeight: 700 
          }}
        >
          OVERVIEW
        </h1>
        <span 
          className="text-xs"
          style={{ color: '#6b7280' }}
        >
          147 cases · 58% pass · Project Scope
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          onClick={onResolve}
          className="h-8 px-4 text-xs font-semibold text-white"
          style={{ backgroundColor: '#ef4444' }}
        >
          Resolve Failures
        </Button>
        <Button 
          size="sm" 
          onClick={onRunTests}
          className="h-8 px-4 text-xs font-semibold text-white gap-1.5"
          style={{ backgroundColor: '#2563eb' }}
        >
          <Play className="h-3.5 w-3.5" fill="white" />
          Run Tests
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATUS RAIL - 48px, single compressed line, gradient background
// ═══════════════════════════════════════════════════════════════════

function StatusRail() {
  return (
    <div 
      className="flex items-center justify-between h-12 px-5"
      style={{ 
        background: 'linear-gradient(90deg, rgba(239,68,68,0.06) 0%, #ffffff 100%)' 
      }}
    >
      {/* Left: Release blocked badge + severity metrics */}
      <div className="flex items-center gap-6">
        {/* RELEASE BLOCKED badge */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded"
          style={{ 
            backgroundColor: 'rgba(239,68,68,0.12)', 
            border: '1px solid rgba(239,68,68,0.3)' 
          }}
        >
          <AlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
          <span 
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: '#ef4444' }}
          >
            RELEASE BLOCKED
          </span>
        </div>
        
        {/* Severity metrics inline */}
        <div className="flex items-center gap-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
              S1 FAIL:
            </span>
            <span 
              className="text-lg font-bold tabular-nums"
              style={{ color: '#ef4444', fontWeight: 700 }}
            >
              7
            </span>
          </div>
          
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
              S2 BLOCK:
            </span>
            <span 
              className="text-lg font-bold tabular-nums"
              style={{ color: '#d97706', fontWeight: 700 }}
            >
              4
            </span>
          </div>
          
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
              S3 UNCOV:
            </span>
            <span 
              className="text-lg font-bold tabular-nums"
              style={{ color: '#404040', fontWeight: 700 }}
            >
              23
            </span>
          </div>
        </div>
      </div>
      
      {/* Right: Pass / Total / Rate */}
      <div className="flex items-center gap-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
            PASS:
          </span>
          <span 
            className="text-xl font-bold tabular-nums"
            style={{ color: '#0d9488', fontWeight: 700 }}
          >
            85
          </span>
        </div>
        
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
            TOTAL:
          </span>
          <span 
            className="text-xl font-bold tabular-nums"
            style={{ color: '#0a0a0a', fontWeight: 700 }}
          >
            147
          </span>
        </div>
        
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
            RATE:
          </span>
          <span 
            className="text-xl font-bold tabular-nums"
            style={{ color: '#d97706', fontWeight: 700 }}
          >
            58%
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCOPE BAR - 32px, tab buttons
// ═══════════════════════════════════════════════════════════════════

function ScopeBar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <div 
      className="flex items-center justify-between h-8 px-5"
      style={{ backgroundColor: '#f5f5f5' }}
    >
      {/* Left: Scope info */}
      <div 
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: '#404040', fontWeight: 600 }}
      >
        PROJECT SCOPE &nbsp;|&nbsp; 8 ACTIVE CYCLES &nbsp;|&nbsp; 8 DISPLAYED
      </div>
      
      {/* Right: Tab buttons */}
      <div className="flex items-center gap-1">
        {['All Cycles', 'Critical', 'In Progress'].map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "px-3 py-1 text-[11px] font-medium rounded transition-colors",
              activeTab === tab 
                ? "bg-white shadow-sm" 
                : "hover:bg-white/50"
            )}
            style={{ 
              color: activeTab === tab ? '#2563eb' : '#404040',
              fontWeight: activeTab === tab ? 600 : 500
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTIONS TABLE - Dense, 36px rows, sticky headers
// ═══════════════════════════════════════════════════════════════════

function ExecutionsTable({ onNavigate }: { onNavigate: (path: string) => void }) {
  const getProgressColor = (val: number) => {
    if (val >= 90) return '#0d9488';
    if (val >= 60) return '#d97706';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div 
        className="flex items-center justify-between px-4 h-9 border-b flex-shrink-0"
        style={{ backgroundColor: '#f8f8f8', borderColor: '#e5e5e5' }}
      >
        <span 
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: '#404040', fontWeight: 700, letterSpacing: '0.06em' }}
        >
          ACTIVE EXECUTIONS
        </span>
        <Link
          to="/tests/cycles"
          className="text-[11px] font-semibold flex items-center hover:underline"
          style={{ color: '#2563eb' }}
        >
          All Cycles <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead className="sticky top-0 z-10">
            <tr style={{ backgroundColor: '#f8f8f8' }}>
              <th 
                className="text-left px-4 py-2 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.05em', width: '28%', borderColor: '#e5e5e5' }}
              >
                CYCLE
              </th>
              <th 
                className="text-left px-3 py-2 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.05em', width: '12%', borderColor: '#e5e5e5' }}
              >
                OWNER
              </th>
              <th 
                className="text-center px-3 py-2 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.05em', width: '16%', borderColor: '#e5e5e5' }}
              >
                FAIL / BLOCK / PASS
              </th>
              <th 
                className="text-center px-3 py-2 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.05em', width: '10%', borderColor: '#e5e5e5' }}
              >
                PROGRESS
              </th>
              <th 
                className="text-center px-3 py-2 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.05em', width: '10%', borderColor: '#e5e5e5' }}
              >
                COVERAGE
              </th>
              <th 
                className="text-left px-3 py-2 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.05em', width: '12%', borderColor: '#e5e5e5' }}
              >
                DUE
              </th>
              <th 
                className="text-right px-4 py-2 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.05em', width: '12%', borderColor: '#e5e5e5' }}
              >
                ACTION
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_EXECUTIONS.map((row) => {
              const isCritical = row.fail > 0;
              const dueColor = row.due === 'Today' ? '#ef4444' : row.due === 'Complete' ? '#0d9488' : '#404040';
              
              return (
                <tr 
                  key={row.id}
                  className="border-b transition-colors"
                  style={{ 
                    backgroundColor: isCritical ? 'rgba(239,68,68,0.04)' : '#ffffff',
                    borderColor: '#e5e5e5',
                    height: '36px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCritical) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isCritical ? 'rgba(239,68,68,0.04)' : '#ffffff';
                  }}
                >
                  {/* Cycle name with status dot */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: isCritical ? '#ef4444' : row.block > 0 ? '#d97706' : '#0d9488' 
                        }}
                      />
                      <span 
                        className="font-medium truncate"
                        style={{ color: '#0a0a0a', fontWeight: 500 }}
                      >
                        {row.name}
                      </span>
                    </div>
                  </td>
                  
                  {/* Owner */}
                  <td className="px-3 py-2">
                    {row.owner ? (
                      <span style={{ color: '#404040', fontWeight: 400 }}>{row.owner}</span>
                    ) : (
                      <span className="flex items-center gap-1" style={{ color: '#d97706', fontWeight: 500 }}>
                        <span>⚠</span> UNASSIGNED
                      </span>
                    )}
                  </td>
                  
                  {/* Fail / Block / Pass stats */}
                  <td className="px-3 py-2 text-center">
                    <span className="tabular-nums font-semibold">
                      <span style={{ color: row.fail > 0 ? '#ef4444' : '#9ca3af' }}>{row.fail}</span>
                      <span style={{ color: '#9ca3af' }}> / </span>
                      <span style={{ color: row.block > 0 ? '#d97706' : '#9ca3af' }}>{row.block}</span>
                      <span style={{ color: '#9ca3af' }}> / </span>
                      <span style={{ color: row.pass > 0 ? '#0d9488' : '#9ca3af' }}>{row.pass}</span>
                    </span>
                  </td>
                  
                  {/* Progress */}
                  <td className="px-3 py-2 text-center">
                    <span 
                      className="tabular-nums font-semibold"
                      style={{ color: getProgressColor(row.progress) }}
                    >
                      {row.progress}%
                    </span>
                  </td>
                  
                  {/* Coverage */}
                  <td className="px-3 py-2 text-center">
                    <span 
                      className="tabular-nums font-semibold"
                      style={{ color: getProgressColor(row.coverage) }}
                    >
                      {row.coverage}%
                    </span>
                  </td>
                  
                  {/* Due */}
                  <td className="px-3 py-2">
                    <span style={{ color: dueColor, fontWeight: 500 }}>
                      {row.due}
                    </span>
                  </td>
                  
                  {/* Action */}
                  <td className="px-4 py-2 text-right">
                    {row.fail > 0 ? (
                      <button 
                        className="text-[11px] font-semibold hover:underline"
                        style={{ color: '#ef4444' }}
                        onClick={() => onNavigate(`cycles/${row.id}`)}
                      >
                        FIX →
                      </button>
                    ) : row.progress === 0 ? (
                      <button 
                        className="text-[11px] font-semibold hover:underline"
                        style={{ color: '#0d9488' }}
                        onClick={() => onNavigate(`cycles/${row.id}`)}
                      >
                        Start →
                      </button>
                    ) : row.progress < 100 ? (
                      <button 
                        className="text-[11px] font-semibold hover:underline"
                        style={{ color: '#d97706' }}
                        onClick={() => onNavigate(`cycles/${row.id}`)}
                      >
                        Run →
                      </button>
                    ) : (
                      <button 
                        className="text-[11px] font-semibold hover:underline"
                        style={{ color: '#2563eb' }}
                        onClick={() => onNavigate(`cycles/${row.id}`)}
                      >
                        View →
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACCOUNTABILITY LOG - Forensic audit trail, 320px fixed width
// ═══════════════════════════════════════════════════════════════════

function AccountabilityLog() {
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'FAILED':
        return { backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' };
      case 'PASSED':
        return { backgroundColor: 'rgba(13,148,136,0.1)', color: '#0d9488' };
      case 'MODIFIED':
        return { backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563eb' };
      case 'CREATED':
        return { backgroundColor: 'rgba(107,114,128,0.1)', color: '#404040' };
      default:
        return { backgroundColor: 'rgba(107,114,128,0.1)', color: '#404040' };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div 
        className="flex items-center justify-between px-4 h-9 border-b flex-shrink-0"
        style={{ backgroundColor: '#f8f8f8', borderColor: '#e5e5e5' }}
      >
        <span 
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: '#404040', fontWeight: 700, letterSpacing: '0.06em' }}
        >
          ACCOUNTABILITY LOG
        </span>
        <button
          className="text-[11px] font-semibold hover:underline"
          style={{ color: '#2563eb' }}
        >
          Export →
        </button>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead className="sticky top-0 z-10">
            <tr style={{ backgroundColor: '#f8f8f8' }}>
              <th 
                className="text-left px-3 py-1.5 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', borderColor: '#e5e5e5' }}
              >
                ACTOR
              </th>
              <th 
                className="text-left px-2 py-1.5 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', borderColor: '#e5e5e5' }}
              >
                ACTION
              </th>
              <th 
                className="text-left px-2 py-1.5 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', borderColor: '#e5e5e5' }}
              >
                ENTITY
              </th>
              <th 
                className="text-right px-3 py-1.5 font-semibold uppercase tracking-wide border-b"
                style={{ color: '#6b7280', fontSize: '10px', borderColor: '#e5e5e5' }}
              >
                TIME
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ACTIVITY_LOG.map((row) => {
              const actionStyle = getActionStyle(row.action);
              
              return (
                <tr 
                  key={row.id}
                  className="border-b transition-colors cursor-pointer"
                  style={{ 
                    borderColor: '#f0f0f0',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  {/* Actor */}
                  <td className="px-3 py-2">
                    <span style={{ color: '#0a0a0a', fontWeight: 500 }}>
                      {row.actor}
                    </span>
                  </td>
                  
                  {/* Action badge */}
                  <td className="px-2 py-2">
                    <span 
                      className="px-1.5 py-0.5 text-[10px] font-semibold rounded"
                      style={{ 
                        ...actionStyle,
                        borderRadius: '3px'
                      }}
                    >
                      {row.action}
                    </span>
                  </td>
                  
                  {/* Entity */}
                  <td className="px-2 py-2">
                    <span 
                      className="truncate block max-w-[120px]"
                      style={{ color: '#404040' }}
                    >
                      {row.entity}
                    </span>
                  </td>
                  
                  {/* Time */}
                  <td className="px-3 py-2 text-right">
                    <span style={{ color: '#9ca3af', fontSize: '10px' }}>
                      {row.time}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GlobalTestsOverviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [runTestsOpen, setRunTestsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All Cycles');

  const scopeType = (searchParams.get('scopeType') as ScopeType) || 'project';
  const scopeId = searchParams.get('scopeId');

  const buildUrl = (path: string) => {
    const base = `/tests/${path}`;
    const params = new URLSearchParams();
    params.set('scopeType', scopeType);
    if (scopeId) params.set('scopeId', scopeId);
    return `${base}?${params.toString()}`;
  };

  const handleNavigate = (path: string) => {
    navigate(buildUrl(path));
  };

  const handleResolve = () => {
    handleNavigate('executions?status=failed');
  };

  return (
    <div 
      className="flex flex-col h-full -m-6"
      style={{ backgroundColor: '#fafafa', fontFamily: 'Inter, sans-serif' }}
    >
      {/* 1. PAGE HEADER - 44px */}
      <PageHeader 
        onResolve={handleResolve}
        onRunTests={() => setRunTestsOpen(true)}
      />
      
      {/* 2. STATUS RAIL - 48px */}
      <StatusRail />
      
      {/* 3. SCOPE BAR - 32px */}
      <ScopeBar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* 4. MAIN CONTENT - Split layout */}
      <div 
        className="flex-1 grid overflow-hidden"
        style={{ 
          gridTemplateColumns: '1fr 320px',
          height: 'calc(100vh - 140px)'
        }}
      >
        {/* Left: Executions Table */}
        <div 
          className="border-r overflow-hidden"
          style={{ borderColor: '#e5e5e5', backgroundColor: '#ffffff' }}
        >
          <ExecutionsTable onNavigate={handleNavigate} />
        </div>
        
        {/* Right: Accountability Log */}
        <div 
          className="overflow-hidden"
          style={{ backgroundColor: '#ffffff' }}
        >
          <AccountabilityLog />
        </div>
      </div>

      {/* Run Tests Modal */}
      <RunTestsModal 
        open={runTestsOpen} 
        onOpenChange={setRunTestsOpen}
        projectId={scopeId || ''}
      />
    </div>
  );
}
