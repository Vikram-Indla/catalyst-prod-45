/**
 * atlaskit-icons.tsx — Lucide-react compatibility shim
 *
 * Drop-in replacement for `lucide-react`. Import from here instead:
 *   import { Plus, X, Check } from '@/lib/atlaskit-icons'
 *
 * Maps every lucide icon name to:
 *   A) @atlaskit/icon/core/* (preferred)
 *   B) @atlaskit/icon/glyph/* (fallback for icons not in core)
 *   C) Inline SVG (for icons with no atlaskit equivalent)
 *
 * Props interface intentionally matches lucide-react for drop-in compatibility:
 *   size?: number  (16 → 'small', ≤28 → 'medium', else → 'large')
 *   color?: string (forwarded as color / primaryColor)
 *   className?: string
 *   strokeWidth?: number (ignored — atlaskit icons are filled)
 *   style?: React.CSSProperties
 */

import React from 'react';

// ─── @atlaskit/icon/core imports ─────────────────────────────────────────────
import AkAdd from '@atlaskit/icon/core/add';
import AkAlert from '@atlaskit/icon/core/alert';
import AkAlignCenter from '@atlaskit/icon/core/align-center';
import AkAlignLeft from '@atlaskit/icon/core/align-left';
import AkAlignRight from '@atlaskit/icon/core/align-right';
import AkAngleBrackets from '@atlaskit/icon/core/angle-brackets';
import AkArchiveBox from '@atlaskit/icon/core/archive-box';
import AkArrowDown from '@atlaskit/icon/core/arrow-down';
import AkArrowLeft from '@atlaskit/icon/core/arrow-left';
import AkArrowRight from '@atlaskit/icon/core/arrow-right';
import AkArrowUp from '@atlaskit/icon/core/arrow-up';
import AkArrowUpRight from '@atlaskit/icon/core/arrow-up-right';
import AkAtlassianIntelligence from '@atlaskit/icon/core/atlassian-intelligence';
import AkAttachment from '@atlaskit/icon/core/attachment';
import AkBoardIcon from '@atlaskit/icon/core/board';
import AkBookWithBookmark from '@atlaskit/icon/core/book-with-bookmark';
import AkBranch from '@atlaskit/icon/core/branch';
import AkBriefcase from '@atlaskit/icon/core/briefcase';
import AkBug from '@atlaskit/icon/core/bug';
import AkCalendar from '@atlaskit/icon/core/calendar';
import AkCamera from '@atlaskit/icon/core/camera';
import AkCash from '@atlaskit/icon/core/cash';
import AkChartBar from '@atlaskit/icon/core/chart-bar';
import AkChartPie from '@atlaskit/icon/core/chart-pie';
import AkChartTrend from '@atlaskit/icon/core/chart-trend';
import AkCheckCircle from '@atlaskit/icon/core/check-circle';
import AkCheckMark from '@atlaskit/icon/core/check-mark';
import AkCheckboxChecked from '@atlaskit/icon/core/checkbox-checked';
import AkClipboard from '@atlaskit/icon/core/clipboard';
import AkClose from '@atlaskit/icon/core/close';
import AkCloudArrowUp from '@atlaskit/icon/core/cloud-arrow-up';
import AkClock from '@atlaskit/icon/core/clock';
import AkCollapseHorizontal from '@atlaskit/icon/core/collapse-horizontal';
import AkCollapseVertical from '@atlaskit/icon/core/collapse-vertical';
import AkComment from '@atlaskit/icon/core/comment';
import AkCopy from '@atlaskit/icon/core/copy';
import AkCreditCard from '@atlaskit/icon/core/credit-card';
import AkCrossCircle from '@atlaskit/icon/core/cross-circle';
import AkCustomize from '@atlaskit/icon/core/customize';
import AkDatabase from '@atlaskit/icon/core/database';
import AkDataFlow from '@atlaskit/icon/core/data-flow';
import AkDelete from '@atlaskit/icon/core/delete';
import AkDashboard from '@atlaskit/icon/core/dashboard';
import AkDownload from '@atlaskit/icon/core/download';
import AkDragHandleHorizontal from '@atlaskit/icon/core/drag-handle-horizontal';
import AkDragHandleVertical from '@atlaskit/icon/core/drag-handle-vertical';
import AkEdit from '@atlaskit/icon/core/edit';
import AkEmail from '@atlaskit/icon/core/email';
import AkEmoji from '@atlaskit/icon/core/emoji';
import AkExpandHorizontal from '@atlaskit/icon/core/expand-horizontal';
import AkExpandVertical from '@atlaskit/icon/core/expand-vertical';
import AkEyeOpen from '@atlaskit/icon/core/eye-open';
import AkEyeOpenStrikethrough from '@atlaskit/icon/core/eye-open-strikethrough';
import AkFeedback from '@atlaskit/icon/core/feedback';
import AkFile from '@atlaskit/icon/core/file';
import AkFilter from '@atlaskit/icon/core/filter';
import AkFlag from '@atlaskit/icon/core/flag';
import AkFlask from '@atlaskit/icon/core/flask';
import AkFolderClosed from '@atlaskit/icon/core/folder-closed';
import AkFolderOpen from '@atlaskit/icon/core/folder-open';
import AkFullscreenEnter from '@atlaskit/icon/core/fullscreen-enter';
import AkFullscreenExit from '@atlaskit/icon/core/fullscreen-exit';
import AkGlobe from '@atlaskit/icon/core/globe';
import AkGoal from '@atlaskit/icon/core/goal';
import AkGrid from '@atlaskit/icon/core/grid';
import AkHashtag from '@atlaskit/icon/core/hashtag';
import AkHome from '@atlaskit/icon/core/home';
import AkImage from '@atlaskit/icon/core/image';
import AkInbox from '@atlaskit/icon/core/inbox';
import AkInformation from '@atlaskit/icon/core/information';
import AkLayoutOneColumn from '@atlaskit/icon/core/layout-one-column';
import AkLayoutTwoColumns from '@atlaskit/icon/core/layout-two-columns';
import AkLayoutThreeColumns from '@atlaskit/icon/core/layout-three-columns';
import AkLibrary from '@atlaskit/icon/core/library';
import AkLightbulb from '@atlaskit/icon/core/lightbulb';
import AkLink from '@atlaskit/icon/core/link';
import AkLinkBroken from '@atlaskit/icon/core/link-broken';
import AkLinkExternal from '@atlaskit/icon/core/link-external';
import AkListBulleted from '@atlaskit/icon/core/list-bulleted';
import AkListChecklist from '@atlaskit/icon/core/list-checklist';
import AkListNumbered from '@atlaskit/icon/core/list-numbered';
import AkLocation from '@atlaskit/icon/core/location';
import AkLockLocked from '@atlaskit/icon/core/lock-locked';
import AkLockUnlocked from '@atlaskit/icon/core/lock-unlocked';
import AkLogIn from '@atlaskit/icon/core/log-in';
import AkLogOut from '@atlaskit/icon/core/log-out';
import AkMagicWand from '@atlaskit/icon/core/magic-wand';
import AkMaximize from '@atlaskit/icon/core/maximize';
import AkMegaphone from '@atlaskit/icon/core/megaphone';
import AkMention from '@atlaskit/icon/core/mention';
import AkMenu from '@atlaskit/icon/core/menu';
import AkMergeSuccess from '@atlaskit/icon/core/merge-success';
import AkMicrophone from '@atlaskit/icon/core/microphone';
// milestone not in this atlaskit version — inline SVG fallback defined below
import AkMinus from '@atlaskit/icon/core/minus';
import AkMinimize from '@atlaskit/icon/core/minimize';
import AkNode from '@atlaskit/icon/core/node';
import AkNotification from '@atlaskit/icon/core/notification';
import AkNotificationMuted from '@atlaskit/icon/core/notification-muted';
import AkObjective from '@atlaskit/icon/core/objective';
import AkOfficeBuilding from '@atlaskit/icon/core/office-building';
import AkPaintPalette from '@atlaskit/icon/core/paint-palette';
import AkPeopleGroup from '@atlaskit/icon/core/people-group';
import AkPerson from '@atlaskit/icon/core/person';
import AkPersonAdd from '@atlaskit/icon/core/person-add';
import AkPersonAdded from '@atlaskit/icon/core/person-added';
import AkPersonRemove from '@atlaskit/icon/core/person-remove';
import AkPin from '@atlaskit/icon/core/pin';
import AkPowerPlug from '@atlaskit/icon/core/power-plug';
import AkPrinter from '@atlaskit/icon/core/printer';
import AkPullRequest from '@atlaskit/icon/core/pull-request';
import AkPulse from '@atlaskit/icon/core/pulse';
import AkQuestionCircle from '@atlaskit/icon/core/question-circle';
import AkRedo from '@atlaskit/icon/core/redo';
import AkRefresh from '@atlaskit/icon/core/refresh';
import AkRelease from '@atlaskit/icon/core/release';
import AkRoadmap from '@atlaskit/icon/core/roadmap';
import AkScales from '@atlaskit/icon/core/scales';
import AkScreen from '@atlaskit/icon/core/screen';
import AkSearch from '@atlaskit/icon/core/search';
import AkSend from '@atlaskit/icon/core/send';
import AkSettings from '@atlaskit/icon/core/settings';
import AkShare from '@atlaskit/icon/core/share';
import AkShield from '@atlaskit/icon/core/shield';
import AkShrinkHorizontal from '@atlaskit/icon/core/shrink-horizontal';
import AkShrinkVertical from '@atlaskit/icon/core/shrink-vertical';
import AkSidebarCollapse from '@atlaskit/icon/core/sidebar-collapse';
import AkSidebarExpand from '@atlaskit/icon/core/sidebar-expand';
import AkSidebarLeft from '@atlaskit/icon/core/sidebar-left';
import AkSidebarRight from '@atlaskit/icon/core/sidebar-right';
import AkShowMoreHorizontal from '@atlaskit/icon/core/show-more-horizontal';
import AkShowMoreVertical from '@atlaskit/icon/core/show-more-vertical';
import AkSortAscending from '@atlaskit/icon/core/sort-ascending';
import AkSortDescending from '@atlaskit/icon/core/sort-descending';
import AkSpreadsheet from '@atlaskit/icon/core/spreadsheet';
import AkStarStarred from '@atlaskit/icon/core/star-starred';
import AkStarUnstarred from '@atlaskit/icon/core/star-unstarred';
import AkStopwatch from '@atlaskit/icon/core/stopwatch';
import AkSummarize from '@atlaskit/icon/core/summarize';
import AkSupport from '@atlaskit/icon/core/support';
import AkTag from '@atlaskit/icon/core/tag';
import AkTarget from '@atlaskit/icon/core/target';
import AkTask from '@atlaskit/icon/core/task';
import AkText from '@atlaskit/icon/core/text';
import AkTextBold from '@atlaskit/icon/core/text-bold';
import AkTextItalic from '@atlaskit/icon/core/text-italic';
import AkTextStrikethrough from '@atlaskit/icon/core/text-strikethrough';
import AkTextUnderline from '@atlaskit/icon/core/text-underline';
import AkThumbsDown from '@atlaskit/icon/core/thumbs-down';
import AkThumbsUp from '@atlaskit/icon/core/thumbs-up';
import AkTimeline from '@atlaskit/icon/core/timeline';
import AkTools from '@atlaskit/icon/core/tools';
import AkTranslate from '@atlaskit/icon/core/translate';
import AkTree from '@atlaskit/icon/core/tree';
import AkUndo from '@atlaskit/icon/core/undo';
import AkUpload from '@atlaskit/icon/core/upload';
import AkVideoPlay from '@atlaskit/icon/core/video-play';
import AkWarning from '@atlaskit/icon/core/warning';
import AkZoomIn from '@atlaskit/icon/core/zoom-in';
import AkZoomOut from '@atlaskit/icon/core/zoom-out';

// ─── @atlaskit/icon/glyph imports ────────────────────────────────────────────
import AkGlyphActivity from '@atlaskit/icon/glyph/activity';
import AkGlyphBook from '@atlaskit/icon/glyph/book';
import AkGlyphCheck from '@atlaskit/icon/glyph/check';
import AkGlyphChevronDown from '@atlaskit/icon/glyph/chevron-down';
import AkGlyphChevronLeft from '@atlaskit/icon/glyph/chevron-left';
import AkGlyphChevronRight from '@atlaskit/icon/glyph/chevron-right';
import AkGlyphChevronUp from '@atlaskit/icon/glyph/chevron-up';
import AkGlyphClose from '@atlaskit/icon/glyph/close';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LucideProps {
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
}

/** Compatible with lucide-react's LucideIcon type */
export type LucideIcon = React.ComponentType<LucideProps>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toAkSize(n?: number): 'small' | 'medium' | 'large' {
  if (!n || n <= 18) return 'small';
  if (n <= 28) return 'medium';
  return 'large';
}

/** Wrap an @atlaskit/icon/core/* component */
function mkCore(Comp: React.ComponentType<any>): React.FC<LucideProps> {
  return function AtlaskitCoreIcon({ size, color, className, style }: LucideProps) {
    return (
      <Comp
        size={toAkSize(size)}
        color={color || 'currentColor'}
        label=""
        className={className}
        style={style}
      />
    );
  };
}

/** Wrap an @atlaskit/icon/glyph/* component (uses primaryColor not color) */
function mkGlyph(Comp: React.ComponentType<any>): React.FC<LucideProps> {
  return function AtlaskitGlyphIcon({ size, color, className, style }: LucideProps) {
    return (
      <Comp
        size={toAkSize(size)}
        primaryColor={color || 'currentColor'}
        label=""
        className={className}
        style={style}
      />
    );
  };
}

/** Inline SVG factory (lucide-style: stroke, fill=none) */
function mkSvg(
  paths: string,
  opts: { fill?: string; w?: number; h?: number } = {}
): React.FC<LucideProps> {
  const vb = `0 0 ${opts.w || 24} ${opts.h || 24}`;
  return function InlineSvgIcon({ size = 16, color, className, style }: LucideProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={vb}
        fill={opts.fill || 'none'}
        stroke={opts.fill ? 'none' : (color || 'currentColor')}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: paths }}
      />
    );
  };
}

// ─── Icon exports ─────────────────────────────────────────────────────────────

// A
export const Activity = mkGlyph(AkGlyphActivity);
export const AlarmClock = mkSvg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>');
export const AlertCircle = mkCore(AkInformation);
export const AlertTriangle = mkCore(AkWarning);
export const Archive = mkCore(AkArchiveBox);
export const ArchiveRestore = mkCore(AkArchiveBox);
export const ArrowDown = mkCore(AkArrowDown);
export const ArrowDownAZ = mkCore(AkSortAscending);
export const ArrowDownNarrowWide = mkCore(AkSortAscending);
export const ArrowDownToLine = mkCore(AkCollapseVertical);
export const ArrowLeft = mkCore(AkArrowLeft);
export const ArrowLeftRight = mkCore(AkExpandHorizontal);
export const ArrowRight = mkCore(AkArrowRight);
export const ArrowRightLeft = mkCore(AkShrinkHorizontal);
export const ArrowUp = mkCore(AkArrowUp);
export const ArrowUpAZ = mkCore(AkSortDescending);
export const ArrowUpDown = mkSvg('<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>');
export const ArrowUpNarrowWide = mkCore(AkSortDescending);
export const ArrowUpRight = mkCore(AkArrowUpRight);
export const ArrowUpToLine = mkCore(AkExpandVertical);
export const AtSign = mkCore(AkMention);
export const Award = mkSvg('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>');

// B
export const Ban = mkSvg('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>');
export const BarChart = mkCore(AkChartBar);
export const BarChart2 = mkCore(AkChartBar);
export const BarChart3 = mkCore(AkChartBar);
export const Battery = mkSvg('<rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/>');
export const Beaker = mkCore(AkFlask);
export const Bell = mkCore(AkNotification);
export const BellOff = mkCore(AkNotificationMuted);
export const Bold = mkCore(AkTextBold);
export const BookCopy = mkGlyph(AkGlyphBook);
export const BookOpen = mkGlyph(AkGlyphBook);
export const Bookmark = mkSvg('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>');
export const BookmarkCheck = mkSvg('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/><path d="m9 10 2 2 4-4"/>');
export const Bot = mkSvg('<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>');
export const Box = mkSvg('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>');
export const BoxIcon = mkSvg('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>');
export const Brain = mkSvg('<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>');
export const Briefcase = mkCore(AkBriefcase);
export const Bug = mkCore(AkBug);
export const Building2 = mkCore(AkOfficeBuilding);

// C
export const Calculator = mkSvg('<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>');
export const Calendar = mkCore(AkCalendar);
export const CalendarCheck = mkCore(AkCalendar);
export const CalendarClock = mkCore(AkCalendar);
export const CalendarDays = mkCore(AkCalendar);
export const CalendarIcon = mkCore(AkCalendar);
export const CalendarOff = mkCore(AkCalendar);
export const CalendarX = mkCore(AkCalendar);
export const CalendarX2 = mkCore(AkCalendar);
export const Camera = mkCore(AkCamera);
export const Check = mkGlyph(AkGlyphCheck);
export const CheckCircle = mkCore(AkCheckCircle);
export const CheckCircle2 = mkCore(AkCheckCircle);
export const CheckSquare = mkCore(AkCheckboxChecked);
export const ChevronDown = mkGlyph(AkGlyphChevronDown);
export const ChevronLeft = mkGlyph(AkGlyphChevronLeft);
export const ChevronRight = mkGlyph(AkGlyphChevronRight);
export const ChevronRightIcon = mkGlyph(AkGlyphChevronRight);
export const ChevronUp = mkGlyph(AkGlyphChevronUp);
export const ChevronsDownUp = mkCore(AkShrinkVertical);
export const ChevronsLeft = mkSvg('<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>');
export const ChevronsLeftRight = mkCore(AkExpandHorizontal);
export const ChevronsRight = mkSvg('<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>');
export const ChevronsRightLeft = mkCore(AkShrinkHorizontal);
export const ChevronsUp = mkSvg('<path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/>');
export const ChevronsUpDown = mkCore(AkExpandVertical);
export const Circle = mkSvg('<circle cx="12" cy="12" r="10"/>');
export const CircleDashed = mkSvg('<circle cx="12" cy="12" r="10" stroke-dasharray="4 4"/>');
export const CircleDot = mkSvg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1" fill="currentColor"/>');
export const CircleUser = mkCore(AkPerson);
export const Clipboard = mkCore(AkClipboard);
export const ClipboardCheck = mkCore(AkClipboard);
export const ClipboardCopy = mkCore(AkClipboard);
export const ClipboardList = mkCore(AkClipboard);
export const Clock = mkCore(AkClock);
export const Cloud = mkSvg('<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>');
export const Code = mkCore(AkAngleBrackets);
export const Code2 = mkCore(AkAngleBrackets);
export const Columns = mkCore(AkLayoutTwoColumns);
export const Columns2 = mkCore(AkLayoutTwoColumns);
export const Columns3 = mkCore(AkLayoutThreeColumns);
export const Command = mkSvg('<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>');
export const Construction = mkCore(AkTools);
export const Copy = mkCore(AkCopy);
export const CopyPlus = mkSvg('<line x1="15" x2="15" y1="12" y2="18"/><line x1="12" x2="18" y1="15" y2="15"/><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>');
export const CornerDownLeft = mkSvg('<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>');
export const CornerDownRight = mkSvg('<polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>');
export const Cpu = mkSvg('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>');
export const CreditCard = mkCore(AkCreditCard);
export const Crown = mkSvg('<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>');

// D
export const Database = mkCore(AkDatabase);
export const Diamond = mkSvg('<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/>');
export const DollarSign = mkCore(AkCash);
export const Download = mkCore(AkDownload);

// E
export const Edit = mkCore(AkEdit);
export const Edit2 = mkCore(AkEdit);
export const Edit3 = mkCore(AkEdit);
export const Equal = mkSvg('<line x1="5" x2="19" y1="9" y2="9"/><line x1="5" x2="19" y1="15" y2="15"/>');
export const ExternalLink = mkCore(AkLinkExternal);
export const Eye = mkCore(AkEyeOpen);
export const EyeOff = mkCore(AkEyeOpenStrikethrough);

// F
export const Figma = mkSvg('<path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/>');
export const File = mkCore(AkFile);
export const FileArchive = mkCore(AkFile);
export const FileBarChart = mkCore(AkFile);
export const FileCheck = mkCore(AkFile);
export const FileIcon = mkCore(AkFile);
export const FileImage = mkCore(AkFile);
export const FileJson = mkCore(AkFile);
export const FileQuestion = mkCore(AkFile);
export const FileSearch = mkCore(AkFile);
export const FileSignature = mkCore(AkFile);
export const FileSpreadsheet = mkCore(AkSpreadsheet);
export const FileStack = mkCore(AkFile);
export const FileText = mkCore(AkFile);
export const FileUp = mkCore(AkUpload);
export const FileVideo = mkCore(AkFile);
export const FileWarning = mkCore(AkFile);
export const FileX = mkCore(AkFile);
export const Film = mkCore(AkVideoPlay);
export const Filter = mkCore(AkFilter);
export const Flag = mkCore(AkFlag);
export const FlagTriangleRight = mkCore(AkFlag);
export const Flame = mkSvg('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>');
export const FlaskConical = mkCore(AkFlask);
export const Folder = mkCore(AkFolderClosed);
export const FolderGit2 = mkCore(AkFolderClosed);
export const FolderInput = mkCore(AkFolderClosed);
export const FolderKanban = mkCore(AkFolderClosed);
export const FolderOpen = mkCore(AkFolderOpen);
export const FolderPlus = mkCore(AkFolderClosed);
export const FolderTree = mkCore(AkFolderClosed);

// G
export const GanttChart = mkCore(AkRoadmap);
export const GanttChartSquare = mkCore(AkRoadmap);
export const Gem = mkSvg('<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>');
export const GitBranch = mkCore(AkBranch);
export const GitCompare = mkSvg('<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>');
export const GitMerge = mkCore(AkMergeSuccess);
export const GitPullRequest = mkCore(AkPullRequest);
export const Ghost = mkSvg('<path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>');
export const Globe = mkCore(AkGlobe);
export const GraduationCap = mkSvg('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>');
export const Grid = mkCore(AkGrid);
export const Grid2x2 = mkCore(AkGrid);
export const Grid3X3 = mkCore(AkGrid);
export const Grid3x3 = mkCore(AkGrid);
export const GripVertical = mkCore(AkDragHandleVertical);

// H
export const Hand = mkSvg('<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>');
export const Hash = mkCore(AkHashtag);
export const HeartPulse = mkCore(AkPulse);
export const HelpCircle = mkCore(AkQuestionCircle);
export const Hexagon = mkSvg('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>');
export const History = mkCore(AkUndo);
export const Home = mkCore(AkHome);

// I
export const Image = mkCore(AkImage);
export const Inbox = mkCore(AkInbox);
export const Info = mkCore(AkInformation);
export const Italic = mkCore(AkTextItalic);

// K
export const Kanban = mkCore(AkBoardIcon);
export const KeyRound = mkSvg('<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>');
export const Keyboard = mkSvg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/>');

// L
export const Layers = mkSvg('<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>');
export const Layout = mkCore(AkLayoutOneColumn);
export const LayoutDashboard = mkCore(AkDashboard);
export const LayoutGrid = mkCore(AkGrid);
export const LayoutList = mkCore(AkListBulleted);
export const Leaf = mkSvg('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>');
export const Library = mkCore(AkLibrary);
export const Lightbulb = mkCore(AkLightbulb);
export const Link = mkCore(AkLink);
export const Link2 = mkCore(AkLink);
export const List = mkCore(AkListBulleted);
export const ListChecks = mkCore(AkListChecklist);
export const ListFilter = mkCore(AkFilter);
export const ListTodo = mkCore(AkListChecklist);
export const ListTree = mkCore(AkTree);
export const Loader2 = ({ size = 16, color, className, style }: LucideProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`animate-spin${className ? ` ${className}` : ''}`}
    style={style}
    aria-hidden
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
export const Lock = mkCore(AkLockLocked);
export const LockOpen = mkCore(AkLockUnlocked);
export const LogOut = mkCore(AkLogOut);

// M
export const Mail = mkCore(AkEmail);
export const Map = mkCore(AkLocation);
export const MapPin = mkCore(AkLocation);
export const Maximize2 = mkCore(AkFullscreenEnter);
export const Megaphone = mkCore(AkMegaphone);
export const Menu = mkCore(AkMenu);
export const MessageCircle = mkCore(AkComment);
export const MessageSquare = mkCore(AkComment);
export const MessageSquarePlus = mkCore(AkComment);
export const Mic = mkCore(AkMicrophone);
export const Milestone = mkSvg('<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>');

export const Minimize2 = mkCore(AkFullscreenExit);
export const Minus = mkCore(AkMinus);
export const MinusCircle = mkSvg('<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>');
export const Monitor = mkCore(AkScreen);
export const MonitorPlay = mkCore(AkScreen);
export const Moon = mkSvg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>');
export const MoreHorizontal = mkCore(AkShowMoreHorizontal);
export const MoreVertical = mkCore(AkShowMoreVertical);
export const Move = mkSvg('<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/>');
export const MoveRight = mkCore(AkArrowRight);
export const MoveVertical = mkSvg('<polyline points="8 18 12 22 16 18"/><polyline points="8 6 12 2 16 6"/><line x1="12" x2="12" y1="2" y2="22"/>');

// N
export const Network = mkCore(AkDataFlow);

// P
export const Package = mkSvg('<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>');
export const Palette = mkCore(AkPaintPalette);
export const PanelLeftClose = mkCore(AkSidebarCollapse);
export const PanelLeftOpen = mkCore(AkSidebarExpand);
export const PanelRight = mkCore(AkSidebarRight);
export const PanelRightClose = mkCore(AkSidebarRight);
export const PanelRightOpen = mkCore(AkSidebarRight);
export const Paperclip = mkCore(AkAttachment);
export const ParkingCircle = mkSvg('<circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>');
export const Pause = mkSvg('<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>');
export const PenTool = mkCore(AkEdit);
export const Pencil = mkCore(AkEdit);
export const PieChart = mkCore(AkChartPie);
export const Pin = mkCore(AkPin);
export const PinOff = mkCore(AkPin);
export const Play = mkCore(AkVideoPlay);
export const PlayCircle = mkCore(AkVideoPlay);
export const Plug = mkCore(AkPowerPlug);
export const Plus = mkCore(AkAdd);
export const PlusCircle = mkCore(AkAdd);
export const Printer = mkCore(AkPrinter);
export const Puzzle = mkSvg('<path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.707l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 2c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02z"/>');

// R
export const Redo2 = mkCore(AkRedo);
export const RefreshCw = mkCore(AkRefresh);
export const Reply = mkSvg('<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>');
export const Rocket = mkSvg('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>');
export const RotateCcw = mkCore(AkUndo);
export const RotateCw = mkCore(AkRefresh);
export const Rows3 = mkSvg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>');

// S
export const Save = mkSvg('<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>');
export const Scale = mkCore(AkScales);
export const ScatterChart = mkSvg('<circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor"/><circle cx="11.5" cy="11.5" r="1.5" fill="currentColor"/><circle cx="7.5" cy="16.5" r="1.5" fill="currentColor"/><circle cx="17.5" cy="14.5" r="1.5" fill="currentColor"/><path d="M3 3v18h18"/>');

export const Search = mkCore(AkSearch);
export const SearchX = mkCore(AkSearch);
export const Send = mkCore(AkSend);
export const Server = mkSvg('<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>');
export const Settings = mkCore(AkSettings);
export const Settings2 = mkCore(AkSettings);
export const Share2 = mkCore(AkShare);
export const Shield = mkCore(AkShield);
export const ShieldAlert = mkCore(AkShield);
export const ShieldCheck = mkCore(AkShield);
export const ShieldOff = mkSvg('<path d="M19.698 13.803A8 8 0 0 1 12 20a8 8 0 0 1-7.698-10.197"/><path d="M4.55 4.55A8 8 0 0 1 12 4c4.418 0 8 3.582 8 8 0 .976-.176 1.91-.498 2.775"/><path d="m2 2 20 20"/>');

export const Siren = mkSvg('<path d="M7 12a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v0"/><path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v0H5v0Z"/><path d="M12 2v3"/><path d="M4.2 4.2 6 6"/><path d="M2 12h3"/><path d="M19.8 4.2 18 6"/><path d="M22 12h-3"/>');
export const SkipForward = mkCore(AkVideoPlay);
export const SlidersHorizontal = mkCore(AkCustomize);
export const Smile = mkCore(AkEmoji);
export const SmilePlus = mkCore(AkEmoji);
export const SortAsc = mkCore(AkSortAscending);
export const Sparkles = mkCore(AkAtlassianIntelligence);
export const Square = mkSvg('<rect width="18" height="18" x="3" y="3" rx="2"/>');
export const SquarePen = mkCore(AkEdit);
export const Star = mkCore(AkStarStarred);
export const StarOff = mkCore(AkStarUnstarred);
export const Sun = mkSvg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>');

// T
export const Table = mkSvg('<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>');
export const Table2 = mkSvg('<path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>');
export const Tag = mkCore(AkTag);
export const Tags = mkCore(AkTag);
export const Target = mkCore(AkTarget);
export const TestTube = mkCore(AkFlask);
export const TestTube2 = mkCore(AkFlask);
export const TestTubes = mkCore(AkFlask);
export const ThumbsDown = mkCore(AkThumbsDown);
export const ThumbsUp = mkCore(AkThumbsUp);
export const Timer = mkCore(AkStopwatch);
export const ToggleLeft = mkSvg('<rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3"/>');
export const ToggleRight = mkSvg('<rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3"/>');
export const Trash2 = mkCore(AkDelete);
export const TrendingDown = mkCore(AkChartTrend);
export const TrendingUp = mkCore(AkChartTrend);
export const Trophy = mkSvg('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>');
export const Tv = mkCore(AkScreen);
export const TvMinimal = mkCore(AkScreen);
export const Type = mkCore(AkText);

// U
export const Undo = mkCore(AkUndo);
export const Undo2 = mkCore(AkUndo);
export const Unlink = mkCore(AkLinkBroken);
export const Unlock = mkCore(AkLockUnlocked);
export const Upload = mkCore(AkUpload);
export const User = mkCore(AkPerson);
export const UserCheck = mkCore(AkPersonAdded);
export const UserCircle = mkCore(AkPerson);
export const UserMinus = mkCore(AkPersonRemove);
export const UserPen = mkCore(AkEdit);
export const UserPlus = mkCore(AkPersonAdd);
export const UserRound = mkCore(AkPerson);
export const UserX = mkCore(AkPersonRemove);
export const Users = mkCore(AkPeopleGroup);
export const Users2 = mkCore(AkPeopleGroup);

// V
export const Variable = mkSvg('<path d="M8 21s-4-3-4-9 4-9 4-9"/><path d="M16 3s4 3 4 9-4 9-4 9"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>');
export const Video = mkCore(AkVideoPlay);

// W
export const Wallet = mkSvg('<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>');
export const Wand2 = mkCore(AkMagicWand);
export const WifiOff = mkSvg('<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>');
export const Wrench = mkCore(AkTools);

// X
export const X = mkCore(AkClose);
export const XCircle = mkCore(AkCrossCircle);

// Z
export const Zap = mkSvg('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>');
export const ZoomIn = mkCore(AkZoomIn);
export const ZoomOut = mkCore(AkZoomOut);

// ─── Additional aliases ───────────────────────────────────────────────────────
// Some files import these specific aliases
export const ChevronDownIcon = ChevronDown;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronUpIcon = ChevronUp;
export const XIcon = X;
export const ImageIcon = Image;
export const BugIcon = Bug;
export const CalendarCheckIcon = CalendarCheck;
export const StarIcon = Star;
export const Layers3 = Layers;
export const BarChart4 = BarChart;

// ─── Additional missing icons (found during build verification) ───────────────
import AkAutomation from '@atlaskit/icon/core/automation';
import AkDeviceMobile from '@atlaskit/icon/core/device-mobile';
import AkProjectionScreen from '@atlaskit/icon/core/projection-screen';
import AkQuotationMark from '@atlaskit/icon/core/quotation-mark';

export const CheckCheck = mkSvg('<path d="M18 7 9.7 15.3 7 12.6"/><path d="m12 7-4 4"/><path d="m4 11 2.6 2.6"/>');
export const ChevronsDown = mkSvg('<path d="m7 6 5 5 5-5"/><path d="m7 13 5 5 5-5"/>');
export const Cog = mkCore(AkSettings);
export const Component = mkSvg('<path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2z"/><path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5z"/><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15z"/>');
export const Contrast = mkSvg('<circle cx="12" cy="12" r="10"/><path d="M12 18a6 6 0 0 0 0-12v12z"/>');
export const Factory = mkCore(AkOfficeBuilding);
export const FileCode = mkCore(AkAngleBrackets);
export const FileDown = mkCore(AkDownload);
export const FilePlus = mkCore(AkFile);
export const Focus = mkCore(AkSearch);
export const FormInput = mkSvg('<rect width="20" height="12" x="2" y="6" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/>');
export const Gauge = mkSvg('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>');
export const GitCommit = mkCore(AkBranch);
export const GitCompareArrows = mkCore(AkBranch);
export const Group = mkCore(AkPeopleGroup);
export const Hammer = mkCore(AkTools);
export const Heart = mkSvg('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>');
export const Highlighter = mkCore(AkEdit);
export const Key = mkSvg('<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 15-2-2"/><path d="m15 21-2-2"/>');
export const ListOrdered = mkCore(AkListNumbered);
export const LogIn = mkCore(AkLogIn);
export const Microscope = mkCore(AkFlask);
export const Mountain = mkSvg('<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>');
export const MousePointer = mkSvg('<path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/>');
export const MoveDown = mkCore(AkArrowDown);
export const MoveUp = mkCore(AkArrowUp);
export const Navigation2 = mkSvg('<polygon points="12 2 19 21 12 17 5 21 12 2"/>');
export const PanelLeft = mkCore(AkSidebarLeft);
export const Power = mkSvg('<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>');
export const Presentation = mkCore(AkProjectionScreen);
export const Quote = mkCore(AkQuotationMark);
export const Radio = mkSvg('<circle cx="12" cy="12" r="2"/><path d="M4.93 19.07A10 10 0 1 1 19.07 4.93"/><path d="M7.76 16.24a6 6 0 1 1 8.48-8.48"/>');
export const Redo = mkCore(AkRedo);
export const RefreshCcw = mkCore(AkRefresh);
export const RemoveFormatting = mkCore(AkEdit);
export const Route = mkSvg('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>');
export const Rows2 = mkSvg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/>');
export const Rows4 = mkSvg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 8.625h18"/><path d="M3 12h18"/><path d="M3 15.375h18"/>');
export const ScanSearch = mkCore(AkSearch);
export const SendHorizontal = mkCore(AkSend);
export const Ship = mkSvg('<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 3V1"/>');
export const ShoppingCart = mkSvg('<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>');
export const Smartphone = mkCore(AkDeviceMobile);
export const StickyNote = mkSvg('<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><polyline points="15 3 15 9 21 9"/>');
export const Strikethrough = mkCore(AkTextStrikethrough);
export const Subscript = mkSvg('<path d="m4 5 8 8"/><path d="m12 5-8 8"/><path d="M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07"/>');
export const Superscript = mkSvg('<path d="m4 19 8-8"/><path d="m12 19-8-8"/><path d="M20 12h-4c0-1.5.44-2 1.5-2.5S20 8.33 20 7c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07"/>');
export const TableProperties = mkSvg('<path d="M15 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h12"/>');
export const Underline = mkCore(AkTextUnderline);
export const Unplug = mkCore(AkPowerPlug);
export const Workflow = mkCore(AkAutomation);
