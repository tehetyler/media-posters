import { proxyUrl } from '../api';

const THUMB_HEIGHT = { poster: 190, backdrop: 120, clearlogo: 90 };
const PANEL_BG     = { clearlogo: '#111' };

export default function ArtworkPanel({ type, label, options, loading, selected, onSelect, currentUrl }) {
  const height  = THUMB_HEIGHT[type] ?? 120;
  const panelBg = PANEL_BG[type] ?? 'transparent';

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.label}>{label}</span>
        {!loading && (
          <span style={s.count}>
            {options.length === 0 ? 'no results' : `${options.length} option${options.length !== 1 ? 's' : ''}`}
          </span>
        )}
        {selected && <span style={s.badge}>✓ Selected</span>}
      </div>

      <div style={s.strip}>
        {loading ? (
          <Skeletons count={5} height={height} />
        ) : (
          <>
            {currentUrl && <CurrentThumb url={currentUrl} height={height} bg={panelBg} />}
            {options.length === 0 ? (
              <span style={s.empty}>No artwork found — file will be left unchanged</span>
            ) : (
              options.map((img, i) => (
                <Thumb
                  key={i}
                  img={img}
                  height={height}
                  bg={panelBg}
                  isSelected={selected === img.downloadUrl}
                  onClick={() => onSelect(img.downloadUrl)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CurrentThumb({ url, height, bg }) {
  const ratio = 2 / 3; // season posters are portrait; use poster ratio as default
  const width = Math.round(height * ratio);
  return (
    <div style={{ ...s.thumbWrap, width }}>
      <div style={{ ...s.thumb, width, height, background: bg || '#0a0a18', outline: '2px solid #4caf7d' }}>
        <img src={url} alt="current" style={s.img} />
      </div>
      <div style={s.currentLabel}>On disk</div>
    </div>
  );
}

function Thumb({ img, height, bg, isSelected, onClick }) {
  const ratio = img.width && img.height ? img.width / img.height : 1.78;
  const width = Math.round(height * ratio);

  return (
    <div onClick={onClick} style={{ ...s.thumbWrap, width }}>
      <div
        style={{
          ...s.thumb,
          width, height,
          background: bg || '#0a0a18',
          outline: isSelected ? '3px solid #3b82f6' : '2px solid transparent',
        }}
      >
        <img
          src={proxyUrl(img.thumbUrl)}
          alt=""
          style={s.img}
          loading="lazy"
          onError={e => { e.currentTarget.style.opacity = '0.2'; }}
        />
        {isSelected && <div style={s.check}>✓</div>}
      </div>
      {img.width && img.height && (
        <div style={s.dims}>{img.width}×{img.height}</div>
      )}
    </div>
  );
}

function Skeletons({ count, height }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: Math.round(height * 0.67) }}>
      <div style={{ ...s.skeleton, height, width: '100%' }} />
      <div style={{ ...s.skeleton, height: 10, width: '60%', borderRadius: 3 }} />
    </div>
  ));
}

const s = {
  panel: {
    background: '#13132a', border: '1px solid #252540', borderRadius: 10,
    padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
  },
  header: { display: 'flex', alignItems: 'center', gap: 10 },
  label:  { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8080a0' },
  count:  { fontSize: 12, color: '#444' },
  badge:  { marginLeft: 'auto', background: '#0f2e1a', color: '#4caf7d', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 },
  strip:  { display: 'flex', gap: 8, overflowX: 'auto', overflowY: 'visible', paddingBottom: 4, alignItems: 'flex-start' },
  thumbWrap:    { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' },
  thumb:        { borderRadius: 6, overflow: 'hidden', position: 'relative', transition: 'outline 0.1s', flexShrink: 0 },
  img:          { width: '100%', height: '100%', objectFit: 'cover' },
  dims:         { fontSize: 10, fontWeight: 600, color: '#555', letterSpacing: '0.03em', whiteSpace: 'nowrap' },
  currentLabel: { fontSize: 10, fontWeight: 600, color: '#4caf7d', letterSpacing: '0.03em', whiteSpace: 'nowrap' },
  check:  {
    position: 'absolute', top: 4, right: 5,
    background: '#3b82f6', color: '#fff',
    borderRadius: 10, width: 20, height: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
  },
  empty:    { color: '#444', fontSize: 13, fontStyle: 'italic', padding: '8px 0' },
  skeleton: {
    flexShrink: 0, borderRadius: 6,
    background: 'linear-gradient(90deg, #1a1a30 25%, #22223a 50%, #1a1a30 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  },
};
