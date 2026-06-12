import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './people.css';

const db = supabase as unknown as { from: (t: string) => any };

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface Props {
  onStartDM: (userId: string, userName: string) => void;
}

export function PeopleSurface({ onStartDM }: Props) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    db.from('profiles')
      .select('id, full_name, avatar_url, email')
      .neq('id', user.id)
      .order('full_name', { ascending: true })
      .limit(200)
      .then(({ data }: { data: Profile[] | null }) => {
        setProfiles(data ?? []);
        setIsLoading(false);
      });
  }, [user?.id]);

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="c-chat-people c-people" aria-label="People">
      <header className="c-activity__hdr">
        <h2 className="c-activity__title">People</h2>
      </header>

      <div className="c-people__search">
        <input
          type="search"
          placeholder="Search teammates…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="c-people__search-input"
          aria-label="Search people"
        />
      </div>

      <div className="c-people__list" role="list">
        {isLoading && (
          <div className="c-feed__skeleton" aria-hidden="true">
            {[['50%', '30%'], ['65%', '40%'], ['45%', '35%']].map((lines, i) => (
              <div key={i} className="c-skel-row" style={{ padding: '0 24px' }}>
                <div className="c-skel-avatar" />
                <div className="c-skel-lines">
                  {lines.map((w, j) => <div key={j} className="c-skel-line" style={{ width: w }} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="c-activity__empty">
            <span className="c-activity__empty__icon">👥</span>
            <p>{search ? 'No teammates match your search.' : 'No teammates found.'}</p>
          </div>
        )}

        {!isLoading && filtered.map(p => (
          <div key={p.id} className="c-person-row" role="listitem">
            <div className="c-person-row__avatar">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="c-person-row__img" />
              ) : (
                <div className="c-person-row__initials">
                  {(p.full_name ?? p.email ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="c-person-row__info">
              <span className="c-person-row__name">
                {p.full_name ?? p.email ?? 'Unknown'}
              </span>
              {p.email && (
                <span className="c-person-row__email">{p.email}</span>
              )}
            </div>
            <button
              className="c-person-row__dm-btn"
              onClick={() => onStartDM(p.id, p.full_name ?? p.email ?? 'DM')}
              aria-label={`Message ${p.full_name ?? p.email}`}
            >
              Message
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
