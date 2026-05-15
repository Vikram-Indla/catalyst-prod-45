/**
 * Hero-left column: eyebrow, tagline, lede, stats.
 * Rendered inside the hero grid of the marketing login page.
 */

import './login-styles.css';
import type { Lang } from './translations';
import { t } from './translations';

interface Props {
  lang: Lang;
}

export function LoginHeroPanel({ lang }: Props) {
  return (
    <div>
      <span className="clmp-eyebrow">{t(lang, 'hero.eyebrow')}</span>

      <h1 className="clmp-tagline">
        {t(lang, 'hero.tagline1')}<br />
        <span className="clmp-tagline-accent">{t(lang, 'hero.tagline2')}</span>
      </h1>

      <p className="clmp-lede">{t(lang, 'hero.lede')}</p>

      <div className="clmp-stat-row" role="list">
        <div className="clmp-stat" role="listitem">
          <div className="clmp-stat-value">9</div>
          <div className="clmp-stat-label">{t(lang, 'stat.modules')}</div>
        </div>
        <div className="clmp-stat" role="listitem">
          <div className="clmp-stat-value">∞</div>
          <div className="clmp-stat-label">{t(lang, 'stat.jira')}</div>
        </div>
        <div className="clmp-stat" role="listitem">
          <div className="clmp-stat-value">AI</div>
          <div className="clmp-stat-label">{t(lang, 'stat.ai')}</div>
        </div>
        <div className="clmp-stat" role="listitem">
          <div className="clmp-stat-value">360°</div>
          <div className="clmp-stat-label">{t(lang, 'stat.resource')}</div>
        </div>
      </div>
    </div>
  );
}
