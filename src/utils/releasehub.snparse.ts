import type { Change } from '@/types/releasehub';

export function parseSnowText(raw: string): Partial<Change> & { confidence: Record<string, 'high' | 'medium' | 'low'> } {
  const lines = raw.split('\n');
  const get = (key: string) => {
    const line = lines.find(l => l.toLowerCase().includes(key.toLowerCase()));
    return line?.split(':').slice(1).join(':').trim();
  };
  const chgNumber = lines[0]?.replace('#', '').trim() || '';
  const category = get('Deployment Category') || get('Category') || '';
  const feReq = get('Frontend Required')?.toLowerCase() === 'yes';
  const feCommit = get('Frontend Details') || get('Frontend Commit') || '';
  const beReq = get('Backend Required')?.toLowerCase() === 'yes';
  const beCommit = get('Backend Details') || get('Backend Commit') || '';
  const process = get('Deployment Process') || 'Execute the CICD Pipeline';
  const title = get('Title') || get('Short Description') || '';

  return {
    chg_number: chgNumber,
    title: title || chgNumber,
    category,
    frontend_required: feReq,
    frontend_commit: feCommit || undefined,
    backend_required: beReq,
    backend_commit: beCommit || undefined,
    deployment_process: process,
    sn_imported: true,
    source: 'servicenow' as any,
    confidence: {
      chg_number: chgNumber ? 'high' : 'low',
      category: category ? 'high' : 'low',
      frontend_commit: feCommit ? 'high' : (feReq ? 'medium' : 'low'),
      backend_commit: beCommit ? 'high' : (beReq ? 'medium' : 'low'),
    },
  };
}
