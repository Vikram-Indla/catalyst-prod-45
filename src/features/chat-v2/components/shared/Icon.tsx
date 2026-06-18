import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

function makeIcon(path: React.ReactNode, viewBox = '0 0 24 24') {
  return function Icon({ size = 18, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {path}
      </svg>
    );
  };
}

export const HomeIcon = makeIcon(<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />);
export const DmsIcon = makeIcon(
  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />,
);
export const BellIcon = makeIcon(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>);
export const FilesIcon = makeIcon(
  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
);
export const BookmarkIcon = makeIcon(<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />);
export const MoreDotsIcon = makeIcon(
  <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
);
export const PlusIcon = makeIcon(<path d="M12 5v14M5 12h14" />);
export const ChevronDownIcon = makeIcon(<path d="M6 9l6 6 6-6" />);
export const ChevronLeftIcon = makeIcon(<path d="M15 18l-6-6 6-6" />);
export const PencilSquareIcon = makeIcon(
  <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
);
export const SearchIcon = makeIcon(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>);
export const StarIcon = makeIcon(<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />);
export const HeadphonesIcon = makeIcon(
  <><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></>,
);
export const XIcon = makeIcon(<path d="M18 6L6 18M6 6l12 12" />);
export const MoonIcon = makeIcon(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />);
export const SunIcon = makeIcon(
  <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
);
export const BoldIcon = makeIcon(
  <><path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" /></>,
);
export const ItalicIcon = makeIcon(<><path d="M19 4h-9M14 20H5M15 4L9 20" /></>);
export const UnderlineIcon = makeIcon(
  <><path d="M6 3v7a6 6 0 0 0 12 0V3" /><path d="M4 21h16" /></>,
);
export const StrikethroughIcon = makeIcon(
  <><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><path d="M4 12h16" /></>,
);
export const LinkIcon = makeIcon(
  <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
);
export const ListOrderedIcon = makeIcon(
  <><path d="M10 6h11M10 12h11M10 18h11" /><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></>,
);
export const ListBulletIcon = makeIcon(
  <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
);
export const SmileyIcon = makeIcon(
  <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
);
export const VideoIcon = makeIcon(
  <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
);
export const MicIcon = makeIcon(
  <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 19v3" /></>,
);
export const SlashIcon = makeIcon(<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M15 8l-6 8" /></>);
export const SendIcon = makeIcon(<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />);
export const LockIcon = makeIcon(
  <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
);
export const HashIcon = makeIcon(<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />);
/** Paper plane with a clock badge — rail icon for Drafts & sent. */
export const DraftsClockIcon = makeIcon(
  <>
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
    <circle cx="17.5" cy="17.5" r="4.5" fill="currentColor" stroke="none" />
    <path d="M17.5 15v2.5l1.5 1" stroke="var(--cv2-bg-rail, #1a1d21)" strokeWidth={1.4} />
  </>,
);
export const ShareIcon = makeIcon(
  <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></>,
);
export const MessageReplyIcon = makeIcon(
  <><path d="M21 11.5a8.38 8.38 0 0 1-7.6 8.4 8.5 8.5 0 0 1-3.8-.5L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5h.5a8.48 8.48 0 0 1 8 8z" /></>,
);
export const CheckIcon = makeIcon(<path d="M5 13l4 4L19 7" />);
/** Slack-style filled green box with white tick (✅ emoji parity). */
export function CheckBoxCheckIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...rest}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#2BAC76" />
      <path
        d="M7 12.5l3.2 3.2L17 9"
        stroke="#FFFFFF"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
export const BookmarkFilledIcon = makeIcon(
  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor" stroke="currentColor" />,
);
export const AaIcon = makeIcon(
  <><path d="M3 18L8 6l5 12M5 14h6" /><path d="M14 18l3.5-8 3.5 8M15.5 15h4" /></>,
);
export const AtIcon = makeIcon(
  <><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></>,
);
export const CalendarIcon = makeIcon(
  <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
);
export const ClockIcon = makeIcon(
  <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
);
export const ChevronRightIcon = makeIcon(<path d="M9 6l6 6-6 6" />);
export const ChevronLeftDoubleIcon = makeIcon(<><path d="M17 18l-6-6 6-6" /><path d="M11 18l-6-6 6-6" /></>);
export const ChevronRightDoubleIcon = makeIcon(<><path d="M7 6l6 6-6 6" /><path d="M13 6l6 6-6 6" /></>);
export const ForwardArrowIcon = makeIcon(<><path d="M15 17l5-5-5-5" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></>);
export const CodeIcon = makeIcon(<><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></>);
export const QuoteIcon = makeIcon(<><path d="M3 7h6v6H3z" /><path d="M3 13c0 4 2 6 4 6M15 7h6v6h-6z" /><path d="M15 13c0 4 2 6 4 6" /></>);
export const CopyLinkIcon = makeIcon(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>);
export const EyesIcon = makeIcon(
  <><circle cx="8" cy="12" r="3" /><circle cx="16" cy="12" r="3" /><circle cx="8" cy="12" r="1" fill="currentColor" /><circle cx="16" cy="12" r="1" fill="currentColor" /></>,
);
export const PencilEditIcon = makeIcon(
  <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
);
export const MarkUnreadIcon = makeIcon(
  <><path d="M4 6h13a2 2 0 0 1 2 2v9" /><path d="M21 4l-9 7-9-7" /><circle cx="20" cy="6" r="3" fill="currentColor" stroke="none" /></>,
);
export const RemindClockIcon = makeIcon(
  <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M5 3L2 6M19 3l3 3" /></>,
);
export const BellOffIcon = makeIcon(
  <><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.89 17.89 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><path d="M1 1l22 22" /></>,
);
export const CopyTextIcon = makeIcon(
  <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
);
export const OrganizeIcon = makeIcon(
  <><path d="M12 3l9 4-9 4-9-4 9-4z" /><path d="M3 12l9 4 9-4M3 17l9 4 9-4" /></>,
);
export const ConnectAppsIcon = makeIcon(
  <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07" /></>,
);
export const TrashIcon = makeIcon(
  <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
);
export const PinIcon = makeIcon(
  <><path d="M12 17v5" /><path d="M9 10.76V6h6v4.76l3 5.24H6l3-5.24z" /></>,
);
export const PinFilledIcon = makeIcon(
  <><path d="M12 17v5" stroke="currentColor" strokeWidth={1.7} /><path d="M9 10.76V6h6v4.76l3 5.24H6l3-5.24z" fill="currentColor" stroke="currentColor" /></>,
);
export const ListAddIcon = makeIcon(
  <><path d="M3 6h13M3 12h13M3 18h9" /><path d="M19 15v6M16 18h6" /></>,
);
export const PaperclipIcon = makeIcon(
  <path d="M21 11l-8.6 8.6a5 5 0 1 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 1 1-2.4-2.4l7.9-7.9" />,
);
export const DownloadIcon = makeIcon(
  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
);
export const CloudUploadIcon = makeIcon(
  <><path d="M20 16.7A5 5 0 0 0 18 7h-1.3A7 7 0 1 0 4 14" /><path d="M8 17l4-4 4 4" /><path d="M12 13v9" /></>,
);
export const FileGenericIcon = makeIcon(
  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
);
export const LockIcon = makeIcon(
  <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
);
export const HashIcon = makeIcon(
  <><path d="M5 9h14M5 15h14M11 4L8 20M16 4l-3 16" /></>,
);
export const ChannelBrowseIcon = makeIcon(
  <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></>,
);
export const GearIcon = makeIcon(
  <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.21.5.7.84 1.24 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
);
export const FilterIcon = makeIcon(<path d="M22 3H2l8 9.46V19l4 2v-8.54z" />);
export const ReplyArrowIcon = makeIcon(<><path d="M9 17l-5-5 5-5" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></>);
export const ViewDenseIcon = makeIcon(
  <><rect x="3" y="4" width="18" height="6" rx="1" /><rect x="3" y="14" width="18" height="6" rx="1" /></>,
);
export const ViewDetailedIcon = makeIcon(
  <><path d="M3 6h18M3 12h18M3 18h18" /></>,
);
export const ThreadInIcon = makeIcon(
  <><path d="M21 11.5a8.38 8.38 0 0 1-7.6 8.4 8.5 8.5 0 0 1-3.8-.5L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5h.5a8.48 8.48 0 0 1 8 8z" /></>,
);
export const SquareIcon = makeIcon(<rect x="4" y="4" width="16" height="16" rx="2" />);
export const MentionIcon = makeIcon(
  <><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></>,
);
export const HuddleIcon = makeIcon(
  <><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></>,
);
// Sparkle-list mark used by the chat header AI Summarize button. Slack uses
// a four-pointed star next to three short bars — mirrored here.
export const SummarizeIcon = makeIcon(
  <>
    <path d="M5 4l1.2 3L9 8l-2.8 1L5 12 3.8 9 1 8l2.8-1z" />
    <path d="M12 10h10" />
    <path d="M12 14h10" />
    <path d="M12 18h10" />
  </>,
);
export const LockClosedIcon = makeIcon(
  <>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
);
