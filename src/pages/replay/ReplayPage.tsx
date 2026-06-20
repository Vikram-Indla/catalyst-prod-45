import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CatalystReplay } from '@/components/replay/CatalystReplay';

export default function ReplayPage() {
  const [params] = useSearchParams();
  const key = params.get('key');
  return <CatalystReplay rootKey={key} />;
}
