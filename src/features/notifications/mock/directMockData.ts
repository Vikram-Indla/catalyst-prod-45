import type { DirectNotification } from '../types';

const T = (h: number, base: Date) =>
  new Date(base.getTime() - h * 3_600_000).toISOString();

const TODAY      = new Date('2026-04-22T10:00:00Z');
const YESTERDAY  = new Date('2026-04-21T10:00:00Z');
const OLDER      = new Date('2026-04-19T10:00:00Z');

const FATIMA  = { id: 'actor-fatima',  displayName: 'Eng. Fatima Al-Harbi' };
const AHMED   = { id: 'actor-ahmed',   displayName: 'Dr. Ahmed Al-Rashid'  };
const NADA    = { id: 'actor-nada',    displayName: 'Nada Al-Fassam'       };
const YAZEED  = { id: 'actor-yazeed',  displayName: 'Yazeed Al-Daraz'      };
const KHALID  = { id: 'actor-khalid', displayName: 'Khalid Al-Mansour'    };
const OMAR    = { id: 'actor-omar',    displayName: 'Omar Al-Hassan'       };

export const MOCK_DIRECT_NOTIFICATIONS: DirectNotification[] = [
  // ── TODAY ──────────────────────────────────────────────────────────────
  {
    id: 'nd-001',
    createdAt: T(2, TODAY),
    readAt: null,
    actor: FATIMA,
    verb: 'assigned',
    target: {
      id: 'item-001',
      key: 'ITEM-5618',
      title: 'Industrial License Validation – Generic error on next click',
      statusLabel: 'ToDo',
      statusAppearance: 'default',
      iconType: 'bug',
    },
    aggregation: { count: 1, actor: FATIMA },
  },
  {
    id: 'nd-002',
    createdAt: T(5, TODAY),
    readAt: T(4, TODAY),
    actor: AHMED,
    verb: 'status_changed',
    target: {
      id: 'item-002',
      key: 'ITEM-5563',
      title: 'Senaei Mobile App SSO login and service redirection',
      statusLabel: 'In QA',
      statusAppearance: 'inprogress',
      iconType: 'story',
    },
  },
  {
    id: 'nd-003',
    createdAt: T(8, TODAY),
    readAt: null,
    actor: NADA,
    verb: 'mentioned',
    target: {
      id: 'item-003',
      key: 'ITEM-5612',
      title: 'API Integration Checklist – Phase 2 scope',
      statusLabel: 'In Progress',
      statusAppearance: 'inprogress',
      iconType: 'task',
    },
    thread: {
      commentPreview: '@Vikram can you confirm if the OAuth flow is scoped for Phase 2 or pushed to Phase 3? The spec doc is ambiguous on this.',
      reactions: { '👍': 2, '🔥': 1 },
      replyCount: 4,
    },
  },

  // ── YESTERDAY ──────────────────────────────────────────────────────────
  {
    id: 'nd-004',
    createdAt: T(0, YESTERDAY),
    readAt: null,
    actor: YAZEED,
    verb: 'commented',
    target: {
      id: 'item-004',
      key: 'ITEM-5617',
      title: 'Industrial Consulting License – There is no Save Draft option',
      statusLabel: 'ToDo',
      statusAppearance: 'default',
      iconType: 'bug',
    },
    aggregation: { count: 1, actor: YAZEED },
    thread: {
      commentPreview: 'The Save Draft button should appear in the bottom action bar. Confirmed in the Figma spec — checking if it's missing from the implementation or just hidden behind a feature flag.',
      reactions: { '👍': 1 },
      replyCount: 2,
    },
  },
  {
    id: 'nd-005',
    createdAt: T(5, YESTERDAY),
    readAt: T(3, YESTERDAY),
    actor: KHALID,
    verb: 'updated',
    target: {
      id: 'item-005',
      key: 'ITEM-5590',
      title: 'Senaei Services Page (Industrial) – Dark Mode responsive update',
      statusLabel: 'ToDo',
      statusAppearance: 'default',
      iconType: 'bug',
    },
    aggregation: { count: 2, actor: YAZEED },
  },
  {
    id: 'nd-006',
    createdAt: T(10, YESTERDAY),
    readAt: null,
    actor: YAZEED,
    verb: 'assigned',
    target: {
      id: 'item-006',
      key: 'ITEM-5616',
      title: 'Industrial License – Unmatched Figma design on personal info page',
      statusLabel: 'ToDo',
      statusAppearance: 'default',
      iconType: 'bug',
    },
    aggregation: { count: 1, actor: YAZEED },
  },

  // ── OLDER ──────────────────────────────────────────────────────────────
  {
    id: 'nd-007',
    createdAt: OLDER.toISOString(),
    readAt: T(-1, OLDER),
    actor: AHMED,
    verb: 'resolved',
    target: {
      id: 'item-007',
      key: 'ITEM-5580',
      title: 'Test Coverage Report – Q2 suite completion',
      statusLabel: 'Done',
      statusAppearance: 'success',
      iconType: 'task',
    },
  },
  {
    id: 'nd-008',
    createdAt: T(6, OLDER),
    readAt: null,
    actor: null,
    verb: 'assigned',
    target: {
      id: 'item-008',
      key: 'ITEM-5575',
      title: 'Release Gate G7 – Ready for production deployment',
      statusLabel: 'ToDo',
      statusAppearance: 'default',
      iconType: 'task',
    },
  },
  {
    id: 'nd-009',
    createdAt: T(12, OLDER),
    readAt: T(10, OLDER),
    actor: OMAR,
    verb: 'approved',
    target: {
      id: 'item-009',
      key: 'ITEM-5560',
      title: 'OKR Milestone Q2 – Ministry of Industry alignment review',
      statusLabel: 'Approved',
      statusAppearance: 'success',
      iconType: 'story',
    },
  },
];
