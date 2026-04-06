import { useTheme } from "@/hooks/useTheme";

const shimmerKeyframes = `
@keyframes notif-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
`;

function ShimmerBlock({ width, height, borderRadius = 4, isDark }: { width: number; height: number; borderRadius?: number; isDark: boolean }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: isDark
        ? 'linear-gradient(90deg, #232019 25%, #2C2823 50%, #232019 75%)'
        : 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
      backgroundSize: '400px 100%',
      animation: 'notif-shimmer 1.4s infinite linear',
    }} />
  );
}

export default function LoadingSkeleton() {
  const { isDark } = useTheme();
  return (
    <div style={{ padding: '12px 20px' }}>
      <style>{shimmerKeyframes}</style>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
          <ShimmerBlock width={40} height={40} borderRadius={20} isDark={isDark} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ShimmerBlock width={180} height={12} isDark={isDark} />
            <ShimmerBlock width={120} height={10} isDark={isDark} />
          </div>
        </div>
      ))}
    </div>
  );
}
