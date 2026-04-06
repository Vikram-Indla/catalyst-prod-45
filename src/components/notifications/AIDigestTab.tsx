import { Loader2, BrainCircuit, RefreshCw } from "lucide-react";
import { useAiDigest, type DigestItem } from "@/hooks/useAiDigest";
import { useTheme } from "@/hooks/useTheme";

const PRIORITY_LIGHT: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: "rgba(248,113,113,0.10)", text: "#F87171" },
  MED: { bg: "rgba(251,191,36,0.10)", text: "#FBBF24" },
  LOW: { bg: "#DCFCE7", text: "#166534" },
};

const PRIORITY_DARK: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: "rgba(239,68,68,0.15)", text: "#FCA5A5" },
  MED: { bg: "rgba(245,158,11,0.15)", text: "#FCD34D" },
  LOW: { bg: "rgba(34,197,94,0.15)", text: "#86EFAC" },
};

export default function AIDigestTab() {
  const { digest, isEmpty, isLoading, isError, refetch } = useAiDigest();
  const { isDark } = useTheme();

  const T = {
    text1: isDark ? '#F5F3F0' : 'rgba(237,237,237,0.93)',
    text2: isDark ? '#A09890' : '#475569',
    text3: isDark ? '#6B6560' : 'rgba(237,237,237,0.40)',
    cardBg: isDark ? '#232019' : '#1A1A1A',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    btnBorder: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.10)',
    loaderText: isDark ? '#A09890' : 'rgba(237,237,237,0.40)',
  };
  const PS = isDark ? PRIORITY_DARK : PRIORITY_LIGHT;

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12 }}>
        <Loader2 size={28} color="#7C3AED" style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: T.loaderText }}>Generating your digest...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Error / null state
  if (isError || (!digest && !isEmpty)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12 }}>
        <BrainCircuit size={32} color="#D8B4FE" />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: T.text1 }}>Digest unavailable</span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: T.text3, textAlign: "center" }}>Unable to generate digest right now. Try again later.</span>
        <button
          onClick={() => refetch()}
          style={{
            marginTop: 8, padding: "6px 16px", borderRadius: 6,
            border: `1px solid ${T.btnBorder}`, background: "transparent",
            fontFamily: "Inter, sans-serif", fontSize: 12, color: T.text2,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty (no notifications in 48h)
  if (isEmpty || (digest && digest.items.length === 0)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12 }}>
        <BrainCircuit size={32} color="#D8B4FE" />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: T.text1 }}>You're all caught up</span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: T.text3, textAlign: "center" }}>No activity in the last 48 hours to summarise.</span>
      </div>
    );
  }

  // Loaded state
  return (
    <div style={{ padding: "12px 20px" }}>
      {/* Purple badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px",
        background: "rgba(124,58,237,.08)",
        border: "0.5px solid rgba(124,58,237,.2)",
        borderRadius: 6,
        marginBottom: 12,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z" fill="#7C3AED" />
        </svg>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#7C3AED" }}>
          AI Digest — Today
        </span>
      </div>

      {/* Summary */}
      {digest?.summary && (
        <p style={{
          fontFamily: "Inter, sans-serif", fontSize: 13, fontStyle: "italic",
          color: T.text2, lineHeight: "20px", margin: "0 0 12px",
        }}>
          {digest.summary}
        </p>
      )}

      {/* Digest items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {digest?.items.map((item: DigestItem, idx: number) => {
          const ps = PS[item.priority] || PS.LOW;
          return (
            <div key={idx} style={{
              padding: "12px 16px",
              background: T.cardBg,
              border: `0.5px solid ${T.cardBorder}`,
              borderRadius: 6,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  display: "inline-block",
                  background: ps.bg, color: ps.text,
                  fontSize: 10, fontWeight: 700, fontFamily: "Inter, sans-serif",
                  textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 999,
                }}>
                  {item.priority}
                </span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: T.text1 }}>
                  {item.title}
                </span>
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: T.text2, margin: "2px 0 0", lineHeight: "18px" }}>
                {item.detail}
              </p>
              {item.hub && (
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.text3, marginTop: 4, display: "inline-block" }}>
                  {item.hub}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Refresh button */}
      <button
        onClick={() => refetch()}
        disabled={isLoading}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          marginTop: 16, padding: 0,
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "Inter, sans-serif", fontSize: 12, color: "#7C3AED",
        }}
      >
        <RefreshCw size={12} />
        {isLoading ? "Refreshing..." : "Refresh digest"}
      </button>
    </div>
  );
}
