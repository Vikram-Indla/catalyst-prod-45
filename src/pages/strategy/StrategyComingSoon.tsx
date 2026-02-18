/**
 * StrategyComingSoon — Placeholder for Strategy Hub sub-pages
 */

import { ComingSoonPage } from '@/components/shared/ComingSoonPage';

interface StrategyComingSoonProps {
  title: string;
}

export default function StrategyComingSoon({ title }: StrategyComingSoonProps) {
  return (
    <ComingSoonPage
      title={title}
      description="This Strategy Hub module is under development."
    />
  );
}
