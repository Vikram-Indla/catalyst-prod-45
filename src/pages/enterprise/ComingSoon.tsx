import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { useLocation } from 'react-router-dom';

export default function EnterpriseComingSoon() {
  const location = useLocation();
  
  // Extract feature name from path
  const pathParts = location.pathname.split('/');
  const feature = pathParts[pathParts.length - 1]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <ComingSoonPage 
      title={feature}
      description="This enterprise feature is being developed according to Jira Align specifications."
    />
  );
}
