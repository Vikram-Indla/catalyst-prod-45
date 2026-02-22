import { useParams } from 'react-router-dom';

const Resource360Page = () => {
  const { resourceId } = useParams<{ resourceId: string }>();

  return (
    <div className="flex flex-col h-full w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="p-5 border-b" style={{ borderColor: '#E2E8F0' }}>
        {/* Resource banner — built in Stage C */}
        <p style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>
          Resource 360° View — Loading resource {resourceId}...
        </p>
      </div>
      <div className="p-3 border-b" style={{ borderColor: '#E2E8F0' }}>
        {/* Toolbar with view tabs, filters — built in Stage C */}
      </div>
      <div className="flex-1 overflow-auto p-5">
        {/* Active view panel — built in Stage C */}
      </div>
    </div>
  );
};

export default Resource360Page;
