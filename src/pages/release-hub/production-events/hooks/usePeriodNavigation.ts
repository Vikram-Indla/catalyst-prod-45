import { useState, useCallback, useMemo } from 'react';
import type { PcPeriodType } from '../types/production-events.types';
import { getCurrentPeriod, navigatePeriod, formatPeriodLabel, formatDateISO } from '../utils/period-helpers';

export function usePeriodNavigation() {
  const [periodType, setPeriodType] = useState<PcPeriodType>('weekly');
  const [period, setPeriod] = useState(() => getCurrentPeriod('weekly'));

  const handlePeriodTypeChange = useCallback((type: PcPeriodType) => {
    setPeriodType(type);
    setPeriod(getCurrentPeriod(type));
  }, []);

  const handleNavigate = useCallback((dir: 'prev' | 'next') => {
    setPeriod(prev => navigatePeriod(periodType, prev.start, dir));
  }, [periodType]);

  const label = useMemo(() => formatPeriodLabel(periodType, period.start, period.end), [periodType, period]);
  const startISO = useMemo(() => formatDateISO(period.start), [period.start]);
  const endISO = useMemo(() => formatDateISO(period.end), [period.end]);

  return { periodType, period, label, startISO, endISO, handlePeriodTypeChange, handleNavigate };
}
