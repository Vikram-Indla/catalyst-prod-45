export function ProgressRing(props: any) {
  const value = props.percent ?? props.value ?? 0;
  return (
    <div className={props.className} style={{ width: props.size || 40, height: props.size || 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {props.showLabel !== false && <span className="text-xs font-medium">{Math.round(value)}%</span>}
    </div>
  );
}
