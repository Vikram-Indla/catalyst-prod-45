export function KeyboardHints() {
  return (
    <div className="fixed bottom-4 right-4 z-40 hidden md:block">
      <div className="bg-white dark:bg-[#262626] border border-[var(--industry-border-default)] rounded-lg px-3 py-2 shadow-sm">
        <span className="text-[12px] text-[var(--industry-text-muted)]">
          ↑↓ Navigate | Space Select | Enter Open
        </span>
      </div>
    </div>
  );
}
