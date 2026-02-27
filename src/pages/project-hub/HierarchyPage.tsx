/**
 * HierarchyPage — Work Item Hierarchy (Stage A skeleton)
 * Route: /project-hub/:key/hierarchy
 * Two-column layout: tree panel (2fr) + detail panel (1fr)
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Zap, Puzzle, BookOpen, ListChecks } from 'lucide-react';
import { HIERARCHY_LEVELS } from '@/types/hierarchy';
import type { LucideProps } from 'lucide-react';

const ICON_MAP: Record<string, React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>> = {
  zap: Zap,
  puzzle: Puzzle,
  'book-open': BookOpen,
  'list-checks': ListChecks,
};

export default function HierarchyPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const [allExpanded, setAllExpanded] = useState(false);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#F8FAFC',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* PAGE HEADER */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
      }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#0F172A',
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          Work Item Hierarchy
        </h1>
        <p style={{
          fontSize: 13,
          color: '#64748B',
          margin: '4px 0 0',
        }}>
          {projectKey?.toUpperCase() || 'Project'} · 0 items
        </p>
      </div>

      {/* TOOLBAR */}
      <div style={{
        padding: '10px 24px',
        borderBottom: '1px solid #F1F5F9',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={() => setAllExpanded(true)}
          style={{
            height: 32,
            padding: '0 12px',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            color: '#334155',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ChevronDown size={14} />
          Expand All
        </button>
        <button
          onClick={() => setAllExpanded(false)}
          style={{
            height: 32,
            padding: '0 12px',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            color: '#334155',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ChevronRight size={14} />
          Collapse All
        </button>

        <div style={{ flex: 1 }} />

        <button
          style={{
            height: 32,
            padding: '0 14px',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            color: '#FFFFFF',
            background: '#2563EB',
            border: '1px solid #2563EB',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Plus size={14} />
          Create
        </button>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* TREE PANEL */}
        <div style={{
          flex: 2,
          overflowY: 'auto',
          padding: 24,
          borderRight: '1px solid #E2E8F0',
        }}>
          {/* EMPTY STATE */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            gap: 16,
            textAlign: 'center',
          }}>
            {/* Level legend */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 8,
            }}>
              {HIERARCHY_LEVELS.map((level) => {
                const Icon = ICON_MAP[level.icon] || Zap;
                return (
                  <div key={level.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: level.colorText,
                    padding: '4px 10px',
                    borderRadius: 9999,
                    background: `${level.color}10`,
                    border: `1px solid ${level.color}30`,
                  }}>
                    <Icon size={12} />
                    {level.name}
                  </div>
                );
              })}
            </div>

            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
            </svg>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                No work items yet
              </p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0', maxWidth: 320 }}>
                Create your first Epic to start building the hierarchy for {projectKey?.toUpperCase() || 'this project'}.
              </p>
            </div>
            <button
              style={{
                height: 34,
                padding: '0 16px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                color: '#FFFFFF',
                background: '#2563EB',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 4,
              }}
            >
              <Plus size={14} />
              Create Epic
            </button>
          </div>
        </div>

        {/* DETAIL PANEL */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          background: '#FFFFFF',
          minWidth: 280,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            gap: 8,
            textAlign: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
              <path d="M15 15l6 6M10 17a7 7 0 110-14 7 7 0 010 14z" />
            </svg>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Select a work item to view details
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
