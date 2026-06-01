import { useEffect, useState } from 'react';
import { fetchStatus } from '../api';

export default function HomePage({ onQueue, onLibrary, onOptions }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStatus().then(setStats).catch(() => {});
  }, []);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <img src="/logo.png" alt="Movie Artwork Reviewer" style={s.logo} />
        <h1 style={s.title}>Movie Artwork Reviewer</h1>
        <p style={s.sub}>Select and download artwork for your movie library</p>
      </header>

      {stats && (
        <div style={s.stats}>
          <StatChip label="Pending"  value={stats.pending}  color="#e2a52a" />
          <StatChip label="Reviewed" value={stats.reviewed} color="#4caf7d" />
          <StatChip label="Skipped"  value={stats.skipped}  color="#7a7a9a" />
          <StatChip label="Total"    value={stats.total}    color="#555" />
        </div>
      )}

      <div className="home-cards">
        <Card
          icon="🎬"
          title="Review Queue"
          desc="Work through movies that need artwork one by one, starting with the oldest."
          cta="Start Reviewing"
          ctaColor="#2563eb"
          onClick={onQueue}
          badge={stats?.pending ? `${stats.pending} pending` : null}
          badgeColor="#e2a52a"
        />
        <Card
          icon="📚"
          title="Movie Library"
          desc="Browse all movies, search by title, filter by status, and revisit any movie."
          cta="Open Library"
          ctaColor="#0f766e"
          onClick={onLibrary}
          badge={stats ? `${stats.total} movies` : null}
          badgeColor="#555"
        />
      </div>

      <div style={s.optionsRow}>
        <button onClick={onOptions} style={s.optionsBtn}>⚙ Options</button>
      </div>
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div style={s.chip}>
      <span style={{ ...s.chipVal, color }}>{value}</span>
      <span style={s.chipLbl}>{label}</span>
    </div>
  );
}

function Card({ icon, title, desc, cta, ctaColor, onClick, badge, badgeColor }) {
  return (
    <div style={s.card} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div style={s.cardTop}>
        <span style={s.icon}>{icon}</span>
        {badge && (
          <span style={{ ...s.badge, background: badgeColor + '22', color: badgeColor }}>
            {badge}
          </span>
        )}
      </div>
      <h2 style={s.cardTitle}>{title}</h2>
      <p style={s.cardDesc}>{desc}</p>
      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        style={{ ...s.cta, background: ctaColor }}
      >
        {cta}
      </button>
    </div>
  );
}

const s = {
  page: {
    maxWidth: 760, margin: '0 auto',
    padding: '48px 20px 40px',
    display: 'flex', flexDirection: 'column', gap: 36,
  },
  header: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  logo:   { width: 120, height: 120, borderRadius: '50%' },
  title:  { fontSize: 28, fontWeight: 800, color: '#f0f0ff' },
  sub:    { fontSize: 15, color: '#666' },
  stats:  {
    display: 'flex', justifyContent: 'center', gap: 32,
    background: '#13132a', border: '1px solid #252540',
    borderRadius: 10, padding: '16px 24px',
  },
  chip:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  chipVal: { fontSize: 22, fontWeight: 700 },
  chipLbl: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' },
  card: {
    background: '#13132a', border: '1px solid #252540', borderRadius: 12,
    padding: '24px', display: 'flex', flexDirection: 'column', gap: 12,
    cursor: 'pointer', transition: 'border-color 0.15s',
  },
  cardTop:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  icon:      { fontSize: 32 },
  badge:     { fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '3px 10px' },
  cardTitle: { fontSize: 18, fontWeight: 700, color: '#e0e0ff' },
  cardDesc:  { fontSize: 14, color: '#777', lineHeight: 1.5, flex: 1 },
  cta:       { color: '#fff', alignSelf: 'flex-start', padding: '9px 20px', marginTop: 4 },
  optionsRow:{ display: 'flex', justifyContent: 'flex-end' },
  optionsBtn:{ background: '#1e1e38', color: '#8080a0', padding: '7px 16px', fontSize: 13 },
};
