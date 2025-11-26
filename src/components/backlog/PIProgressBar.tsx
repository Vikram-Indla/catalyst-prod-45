interface PIProgressBarProps {
  progress: number;
}

export function PIProgressBar({ progress }: PIProgressBarProps) {
  return (
    <div className="flex items-center gap-2 ml-4">
      <span className="text-sm text-[#6B778C]">PI Progress:</span>
      <div className="w-20 h-2 bg-[#EBECF0] rounded overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#FF5630] to-[#FF8B00] rounded"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
