import { useState } from 'react';

const ITEMS = [
  { key: 'poster',    label: 'Poster',      darkBg: false },
  { key: 'backdrop',  label: 'Background',  darkBg: false },
  { key: 'clearlogo', label: 'Clear Logo',  darkBg: true  },
];

const BANNER_HEIGHT = 180; // px — images are scaled to this height

export default function CurrentArtworkBanner({ currentArtwork }) {
  const present = ITEMS.filter(item => currentArtwork[item.key]);
  if (present.length === 0) return null;

  return (
    <div style={s.banner}>
      <span style={s.title}>Currently on Disk</span>
      <div style={s.scroll}>
        {present.map(item => (
          <BannerImage
            key={item.key}
            url={currentArtwork[item.key]}
            label={item.label}
            darkBg={item.darkBg}
          />
        ))}
      </div>
    </div>
  );
}

function BannerImage({ url, label, darkBg }) {
  const [dims, setDims] = useState(null);

  return (
    <div style={s.item}>
      <div style={{ ...s.imgWrap, background: darkBg ? '#111' : '#0a0a18' }}>
        <img
          src={url}
          alt={label}
          style={s.img}
          onLoad={e => setDims({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
          onError={e => { e.currentTarget.style.opacity = '0.2'; }}
        />
      </div>
      <div style={s.meta}>
        <span style={s.label}>{label}</span>
        {dims
          ? <span style={s.dims}>{dims.w} × {dims.h}</span>
          : <span style={{ ...s.dims, color: '#444' }}>loading…</span>
        }
      </div>
    </div>
  );
}

const s = {
  banner: {
    background: '#13132a',
    border: '1px solid #252540',
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  title: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#8080a0',
  },
  scroll: {
    display: 'flex',
    gap: 16,
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
  },
  imgWrap: {
    height: BANNER_HEIGHT,
    width: 'fit-content',
    borderRadius: 6,
    overflow: 'hidden',
    border: '1px solid #2a2a44',
  },
  img: {
    height: '100%',
    width: 'auto',
    display: 'block',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  label: { fontSize: 12, fontWeight: 600, color: '#9090b0' },
  dims:  { fontSize: 11, color: '#e2a52a', fontVariantNumeric: 'tabular-nums' },
};
