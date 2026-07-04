/**
 * DefectDetailPage — /testhub/defects/:defectKey
 *
 * P1-S13 (CAT-TESTHUB-PROD-20260703-001): mounts the canonical
 * CatalystDetailRouter (entityKind='tm_defect') in fullPageMode — same
 * pattern as IncidentDetailPage/IssueFullPage. No pre-resolution needed:
 * tm_defects is keyed unambiguously by defect_key, so itemId is passed
 * straight through to CatalystViewTmDefect's own lookup.
 */
import { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Routes } from '@/lib/routes';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

export default function DefectDetailPage() {
  const { defectKey } = useParams<{ defectKey: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Suspense fallback={null}>
        <CatalystDetailRouter
          isOpen={true}
          onClose={() => navigate(Routes.testHub.defects())}
          itemId={defectKey}
          entityKind="tm_defect"
          fullPageMode={true}
        />
      </Suspense>
    </div>
  );
}
