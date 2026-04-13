/**
 * IssueRightPanel — Flat right panel: underline tabs + Copy in header,
 * body switches between AllWorkTab and FieldsTab.
 */
import { useState, useMemo } from 'react';
import { Copy } from 'lucide-react';
import { AllWorkTab } from './AllWorkTab';
import { FieldsTab } from './FieldsTab';
import { CopyMenu } from './copy/CopyMenu';
import type { AllWorkItem } from '@/types/allwork.types';

type RightTab = 'allwork' | 'fields';

interface Props {
  issueKey: string | null;
  isDark: boolean;
  item?: AllWorkItem | null;
  parentItem?: AllWorkItem | null;
  children?: AllWorkItem[];
  childrenLoading?: boolean;
  links?: any[];
  linksLoading?: boolean;
  comments?: any[];
  commentsLoading?: boolean;
  history?: any[];
  historyLoading?: boolean;
  createComment?: any;
}

export function IssueRightPanel({
  issueKey, isDark, item, parentItem,
  children: childItems = [], childrenLoading = false,
  links = [], linksLoading = false,
  comments = [], commentsLoading = false,
  history = [], historyLoading = false,
  createComment,
}: Props) {
  const [tab, setTab] = useState<RightTab>(() => {
    const s = localStorage.getItem('allwork.rightTab');
    return s === 'fields' ? 'fields' : 'allwork';
  });

  const handleTab = (t: RightTab) => {
    setTab(t);
    localStorage.setItem('allwork.rightTab', t);
  };

  if (!issueKey) {
    return (
      <div className="awBody" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--aw-text-subtle)', fontSize: 13 }}>Select an issue</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Header: underline tabs + Copy ── */}
      <div className="awHeader">
        <div className="awRightTop">
          <div className="awTabs">
            <button
              className={`awTab ${tab === 'allwork' ? 'awTabActive' : ''}`}
              onClick={() => handleTab('allwork')}
            >
              All work
            </button>
            <button
              className={`awTab ${tab === 'fields' ? 'awTabActive' : ''}`}
              onClick={() => handleTab('fields')}
            >
              Fields
            </button>
          </div>
          <CopyMenu issueKey={issueKey} item={item} isDark={isDark} />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="awBody awRightBody">
        {tab === 'allwork' ? (
          <AllWorkTab
            issueKey={issueKey}
            isDark={isDark}
            item={item}
            parentItem={parentItem}
            children={childItems}
            childrenLoading={childrenLoading}
            links={links}
            linksLoading={linksLoading}
            comments={comments}
            commentsLoading={commentsLoading}
            history={history}
            historyLoading={historyLoading}
            createComment={createComment}
          />
        ) : (
          <FieldsTab issueKey={issueKey} isDark={isDark} item={item} />
        )}
      </div>
    </>
  );
}
