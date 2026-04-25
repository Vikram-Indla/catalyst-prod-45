/**
 * WatchButton — Eye icon toggle for watching issues
 * Light mode only.
 */
import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useWatching } from "@/hooks/useWatching";
import { toast } from "sonner";

interface WatchButtonProps {
  issueId: string;
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}

export default function WatchButton({ issueId, size = "sm", showCount = false, className }: WatchButtonProps) {
  const { isWatching, watcherCount, toggleWatch, isLoading } = useWatching(issueId);

  const px = size === "sm" ? 24 : 28;
  const iconSize = size === "sm" ? 14 : 16;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await toggleWatch();
    if (isWatching) {
      toast("Unwatched", {
        icon: <EyeOff size={16} color="#94A3B8" />,
        duration: 2000,
      });
    } else {
      toast("Watching — you'll be notified of all activity", {
        icon: <Eye size={16} color="#2563EB" />,
        duration: 2000,
      });
    }
  };

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <button
        onClick={handleClick}
        disabled={isLoading}
        aria-label={isWatching ? "Unwatch issue" : "Watch issue"}
        aria-pressed={isWatching}
        title={isWatching ? `Unwatch (${watcherCount} watching)` : "Watch"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: px,
          height: px,
          borderRadius: 4,
          border: "none",
          background: isWatching ? "rgba(37,99,235,0.08)" : "transparent",
          color: isWatching ? "#2563EB" : "#94A3B8",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.5 : 1,
          transition: "background 120ms, color 120ms",
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!isWatching) {
            e.currentTarget.style.background = "rgba(0,0,0,0.04)";
            e.currentTarget.style.color = "#475569";
          }
        }}
        onMouseLeave={(e) => {
          if (!isWatching) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#94A3B8";
          }
        }}
      >
        <Eye size={iconSize} strokeWidth={1.5} />
      </button>
      {showCount && (
        <span
          style={{
            fontFamily: 'var(--ds-font-family-monospaced)',
            fontSize: 10,
            color: "#94A3B8",
            minWidth: 12,
          }}
        >
          {watcherCount}
        </span>
      )}
    </span>
  );
}
