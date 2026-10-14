/* ============================================================
   Mindra UI Kit — Component library (JSX)
   ============================================================ */

(() => {

const { MoodGlyph } = window;

/* ---------- Icons (inline SVG, currentColor) ---------- */
const I = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
      <path d="M12 9v4M12 17v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
      <path d="M12 3l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 16l-5.3 3 1.3-5.9-4.5-4 6-.6L12 3Z"/>
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M12 11v6M12 7.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="M12 3l9.5 17h-19L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M12 10v4M12 17v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  beranda: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
  ),
  asesmen: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-4 3v-3H6a2 2 0 0 1-2-2V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="9" cy="11" r="0.9" fill="currentColor"/><circle cx="12.5" cy="11" r="0.9" fill="currentColor"/><circle cx="16" cy="11" r="0.9" fill="currentColor"/></svg>
  ),
  konsultasi: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M17 10l4-2v8l-4-2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
  ),
  profil: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.7"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="7" y="4" width="10" height="3" rx="1" stroke="currentColor" strokeWidth="1.6"/><path d="M7 6H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
};

/* ============================================================
   BUTTON
   ============================================================ */
function Button({ variant = 'primary', size = 'lg', full, fixed, disabled, loading, children, leadingIcon, trailingIcon, onClick }) {
  const cls = ['mn-btn', variant];
  if (size === 'sm') cls.push('sm');
  if (full) cls.push('full');
  if (fixed) cls.push('fixed');
  return (
    <button className={cls.join(' ')} disabled={disabled || loading} onClick={onClick}>
      {loading ? <div className="mn-spinner" /> : leadingIcon}
      {!loading && children}
      {!loading && trailingIcon}
    </button>
  );
}

/* ============================================================
   INPUTS
   ============================================================ */
function TextField({ label, value, placeholder, helper, error, type = 'text', onChange }) {
  const [val, setVal] = React.useState(value || '');
  React.useEffect(() => setVal(value || ''), [value]);
  const filled = !!val;
  return (
    <div className="mn-field">
      <div className={'mn-floating' + (filled ? ' filled' : '')}>
        <input
          className={'mn-input' + (error ? ' error' : '')}
          type={type}
          placeholder={filled ? '' : (placeholder || ' ')}
          value={val}
          onChange={(e) => { setVal(e.target.value); onChange && onChange(e.target.value); }}
        />
        {label && <label>{label}</label>}
      </div>
      {(helper || error) && (
        <div className={'mn-helper' + (error ? ' error' : '')}>
          {error && <span style={{ width: 14, height: 14, display: 'grid', placeItems: 'center' }}>{I.warning}</span>}
          {error || helper}
        </div>
      )}
    </div>
  );
}

function Textarea({ label, value, placeholder, helper, error, onChange }) {
  return (
    <div className="mn-field">
      {label && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>{label}</div>}
      <textarea
        className={'mn-textarea' + (error ? ' error' : '')}
        placeholder={placeholder}
        defaultValue={value}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
      {(helper || error) && (
        <div className={'mn-helper' + (error ? ' error' : '')}>
          {error && <span style={{ width: 14, height: 14, display: 'grid', placeItems: 'center' }}>{I.warning}</span>}
          {error || helper}
        </div>
      )}
    </div>
  );
}

function SearchBar({ placeholder = 'Cari artikel, latihan, atau psikolog' }) {
  return (
    <div className="mn-search">
      <span className="ic">{I.search}</span>
      <input type="search" placeholder={placeholder} />
    </div>
  );
}

/* ============================================================
   CARDS
   ============================================================ */
function CardDefault({ children, style }) {
  return <div className="mn-card" style={style}>{children}</div>;
}

function CardMood({ mood, label, time }) {
  const colors = {
    'sangat-baik':  '#FFD700',
    'baik':         '#90EE90',
    'cukup':        '#87CEEB',
    'netral':       '#DDA0DD',
    'kurang':       '#FFA07A',
    'buruk':        '#CD853F',
    'sangat-buruk': '#708090',
  };
  const glyphMap = {
    'sangat-baik': 'bahagia',  'baik': 'syukur',  'cukup': 'tenang',
    'netral':      'lelah',    'kurang': 'cemas', 'buruk': 'sedih',
    'sangat-buruk':'sedih',
  };
  return (
    <div className="mn-mood-card">
      <div className="indicator" style={{ background: colors[mood] }} />
      <div className="glyph"><MoodGlyph id={glyphMap[mood]} size={32}/></div>
      <div className="info">
        <div className="name">{label}</div>
        <div className="time">{time}</div>
      </div>
    </div>
  );
}

function CardPsikolog({ name, spec, rating, count, price, avatar, online }) {
  return (
    <div className="mn-psikolog">
      <Avatar size="l" name={name} src={avatar} online={online} />
      <div className="info">
        <div className="name">{name}</div>
        <div className="spec">{spec}</div>
        <div className="rating">
          <span style={{ color: 'var(--matahari-500)', display: 'grid', placeItems: 'center' }}>{I.star}</span>
          <span className="score">{rating}</span>
          <span className="count">· {count} ulasan</span>
        </div>
      </div>
      <div className="actions">
        <div className="price">Rp {price}<span className="unit"> /sesi</span></div>
        <Button size="sm" variant="primary">Booking</Button>
      </div>
    </div>
  );
}

function CardArtikel({ category, title, readTime, thumb }) {
  return (
    <div className="mn-artikel">
      <div className="thumb" style={{ background: thumb }} />
      <div className="body">
        <div>
          <div className="cat">{category}</div>
          <div className="title">{title}</div>
        </div>
        <div className="meta">{readTime} <span className="dot"/> baca cepat</div>
      </div>
    </div>
  );
}

function CardAsesmen({ title, durasi, status, progress }) {
  const done = status === 'sudah';
  return (
    <div className={'mn-asesmen' + (done ? ' done' : '')}>
      <div className="head">
        <div className="ic-box">{done ? I.check : I.clipboard}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="title">{title}</div>
          <div className="meta">{durasi} · {done ? 'Selesai' : 'Belum dimulai'}</div>
        </div>
      </div>
      <div className="progress-track"><div className="progress-bar" style={{ width: progress + '%' }} /></div>
      <div className="status-row">
        <span className="label">{done ? 'Hasil tersedia' : 'Kemajuan'}</span>
        <span className="pct">{progress}%</span>
      </div>
    </div>
  );
}

/* ============================================================
   BOTTOM NAVIGATION
   ============================================================ */
function BottomNavClinical({ active = 'beranda', badge = 'chat' }) {
  const items = [
    { id: 'beranda',    lbl: 'Beranda',     ic: I.beranda },
    { id: 'asesmen',    lbl: 'Asesmen',     ic: I.asesmen },
    { id: 'chat',       lbl: 'Chat',        ic: I.chat },
    { id: 'konsultasi', lbl: 'Konsultasi',  ic: I.konsultasi },
    { id: 'profil',     lbl: 'Profil',      ic: I.profil },
  ];
  return (
    <div className="mn-bottomnav">
      {items.map(it => (
        <div key={it.id} className={'tab' + (active === it.id ? ' active' : '')}>
          {it.ic}
          <div className="lbl">{it.lbl}</div>
          {badge === it.id && <div className="badge"/>}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   BADGES & CHIPS
   ============================================================ */
function Badge({ kind, children }) {
  return <span className={'mn-badge ' + kind}><span className="dot"/>{children}</span>;
}

function Chip({ active, swatch, children, onClick }) {
  return (
    <span className={'mn-chip' + (active ? ' active' : '')} onClick={onClick}>
      {swatch && <span className="swatch" style={{ background: swatch }}/>}
      {children}
    </span>
  );
}

/* ============================================================
   AVATAR
   ============================================================ */
function Avatar({ size = 'm', src, name, online }) {
  const initials = (name || '').trim().split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  return (
    <div className={'mn-avatar ' + size}>
      {src && <div className="img" style={{ backgroundImage: `url(${src})` }} />}
      {!src && <span className="initials">{initials || '·'}</span>}
      {online && <span className="online" />}
    </div>
  );
}

/* ============================================================
   TOASTS
   ============================================================ */
function Toast({ kind = 'info', title, msg, onClose }) {
  const icons = { success: I.check, warning: I.alert, error: I.alert, info: I.info };
  return (
    <div className={'mn-toast ' + kind}>
      <div className="ic">{icons[kind]}</div>
      <div className="body">
        <div className="title">{title}</div>
        {msg && <div className="msg">{msg}</div>}
      </div>
      <button className="close" onClick={onClose} aria-label="dismiss">{I.close}</button>
    </div>
  );
}

Object.assign(window, {
  Button, TextField, Textarea, SearchBar,
  CardDefault, CardMood, CardPsikolog, CardArtikel, CardAsesmen,
  BottomNavClinical, Badge, Chip, Avatar, Toast,
});

})();
