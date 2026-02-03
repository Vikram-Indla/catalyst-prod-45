// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { Plus } from 'lucide-react';

interface T10HeaderProps {
  onCreateList?: () => void;
}

export function T10Header({ onCreateList }: T10HeaderProps) {
  return (
    <header className="t10-header">
      <div className="t10-header__left">
        <div className="t10-header__icon-box">10</div>
        <div>
          <h1 className="t10-header__title">Task¹⁰</h1>
          <p className="t10-header__tagline">Top 10 Priority Management</p>
        </div>
      </div>
      
      <button
        onClick={onCreateList}
        className="t10-btn t10-btn--primary"
      >
        <Plus className="t10-btn__icon" />
        New List
      </button>
    </header>
  );
}

export default T10Header;
