export function FeatureQuickView({ feature, onClose }: any) {
  const displayId = feature?.display_id || feature?.id || 'N/A';
  
  return (
    <div className="p-4">
      <h2 className="font-bold text-lg">Feature #{displayId}</h2>
      <p className="text-sm text-muted-foreground mt-1">{feature?.name}</p>
      <div className="mt-4 space-y-3">
        <div>
          <span className="text-xs font-medium text-muted-foreground">Status: </span>
          <span className="text-sm">{feature?.status || 'N/A'}</span>
        </div>
        {feature?.blocked && (
          <div className="text-sm text-red-600 font-medium">⚠️ Blocked</div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-6">Feature Quick View (Full implementation pending)</p>
    </div>
  );
}
