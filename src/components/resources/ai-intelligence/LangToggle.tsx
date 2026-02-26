import React from 'react';

export type Lang = 'en' | 'ar';

interface LangToggleProps {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

export const LangToggle: React.FC<LangToggleProps> = ({ lang, onChange }) => (
  <div className="rai-lang-toggle">
    <button
      className={`rai-lang-btn ${lang === 'en' ? 'rai-lang-active' : ''}`}
      onClick={() => onChange('en')}
    >
      EN
    </button>
    <button
      className={`rai-lang-btn rai-lang-btn-ar ${lang === 'ar' ? 'rai-lang-active' : ''}`}
      onClick={() => onChange('ar')}
    >
      عربي
    </button>
  </div>
);
