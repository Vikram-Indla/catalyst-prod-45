const shimmerKeyframes = `
@keyframes notif-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
`;

function ShimmerBlock({ width, height, borderRadius = 4 }: { width: number; height: number; borderRadius?: number }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
      backgroundSize: '400px 100%',
      animation: 'notif-shimmer 1.4s infinite linear',
    }} />
  );
}

export default function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 20px' }}>
      <style>{shimmerKeyframes}</style>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
          <ShimmerBlock width={40} height={40} borderRadius={20} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ShimmerBlock width={180} height={12} />
            <ShimmerBlock width={120} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
