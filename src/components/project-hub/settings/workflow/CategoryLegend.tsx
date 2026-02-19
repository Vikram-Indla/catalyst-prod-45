const CATEGORIES = [
  { name: 'To Do', color: '#A3A3A3', description: 'Not yet started. Counted as remaining.' },
  { name: 'In Progress', color: '#2563EB', description: 'Actively being worked on.' },
  { name: 'Done', color: '#0D9488', description: 'Completed. Counted toward progress %.' },
  { name: 'Terminal', color: '#D4D4D4', description: 'Excluded from progress (Cancelled, Won\'t Do).' },
];

export function CategoryLegend() {
  return (
    <div
      className="rounded-xl"
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '20px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>
        Status Categories
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map(cat => (
          <div key={cat.name} className="flex items-start gap-3">
            <div
              className="flex-shrink-0 rounded-full mt-1"
              style={{ width: 10, height: 10, background: cat.color }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{cat.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{cat.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
