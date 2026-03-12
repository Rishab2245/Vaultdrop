'use client';

import { type FeedFilters, type SecretCategory } from '@/types';

const CATEGORIES: Array<{ value: SecretCategory | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'ALL' },
  { value: 'CORPORATE', label: 'CORP' },
  { value: 'POLITICAL', label: 'POLITICAL' },
  { value: 'CELEBRITY', label: 'CELEB' },
  { value: 'PERSONAL', label: 'PERSONAL' },
  { value: 'INDUSTRY', label: 'INDUSTRY' },
  { value: 'PARANORMAL', label: 'PARA' },
  { value: 'ZERO_DAY', label: 'ZERO DAY' },
];

const SORT_OPTIONS: Array<{ value: FeedFilters['sort']; label: string }> = [
  { value: 'HOT', label: 'HOT' },
  { value: 'NEW', label: 'NEW' },
  { value: 'TOP', label: 'TOP' },
];

interface FeedFiltersProps {
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  totalCount?: number;
}

export default function FeedFilters({ filters, onChange, totalCount }: FeedFiltersProps) {
  const setCategory = (category: SecretCategory | 'ALL') => onChange({ ...filters, category });
  const setSort = (sort: FeedFilters['sort']) => onChange({ ...filters, sort });
  const toggleGhost = () => onChange({ ...filters, ghostOnly: !filters.ghostOnly });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '8px',
    padding: '7px 13px',
    cursor: 'pointer',
    border: 'none',
    background: active ? '#c9a227' : 'transparent',
    color: active ? '#0b0d12' : '#6a7a8e',
    boxShadow: active
      ? '0 3px 0 0 #8a6c14'
      : '0 0 0 1px #1e2535',
    transition: 'all 0.1s',
    letterSpacing: '1px',
  });

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Sort + ghost row */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {SORT_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => setSort(opt.value)} style={tabStyle(filters.sort === opt.value)}>
            {opt.label}
          </button>
        ))}

        <button
          onClick={toggleGhost}
          style={{
            ...tabStyle(!!filters.ghostOnly),
            background: filters.ghostOnly ? '#1e2535' : 'transparent',
            color: filters.ghostOnly ? '#4a7fa5' : '#3a4558',
            boxShadow: filters.ghostOnly ? '0 0 0 1px #4a7fa5' : '0 0 0 1px #1e2535',
            marginLeft: 'auto',
          }}
        >
          GHOST ONLY
        </button>

        {totalCount !== undefined && (
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '7px', color: '#3a4558' }}>
            {totalCount}
          </span>
        )}
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => {
          const isActive = filters.category === cat.value || (!filters.category && cat.value === 'ALL');
          return (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cat.value !== 'ALL' ? `badge-${cat.value}` : ''}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                border: 'none',
                opacity: isActive ? 1 : 0.45,
                background: cat.value === 'ALL'
                  ? isActive ? '#c9a22720' : 'transparent'
                  : undefined,
                color: cat.value === 'ALL'
                  ? isActive ? '#c9a227' : '#6a7a8e'
                  : undefined,
                outline: isActive ? '1px solid currentColor' : '1px solid transparent',
                outlineOffset: '2px',
                transition: 'opacity 0.15s',
                letterSpacing: '1px',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
