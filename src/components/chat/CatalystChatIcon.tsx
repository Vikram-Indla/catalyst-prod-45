import catalystChatIcon from '@/assets/catalyst-chat-icon.svg';

interface CatalystChatIconProps {
  size?: number;
}

export function CatalystChatIcon({ size = 32 }: CatalystChatIconProps) {
  return <img src={catalystChatIcon} alt="" width={size} height={size} />;
}
