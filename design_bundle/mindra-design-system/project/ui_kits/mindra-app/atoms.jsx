/* ============================================================
   Mindra UI Kit — shared atoms used across screens
   Loaded as a Babel script. Exports atoms to window.
   ============================================================ */

(() => {

const MoodGlyph = ({ id, size = 44 }) => (
  <img src={`../../assets/mood/${id}.svg`} style={{ width: size, height: 'auto', display: 'block' }} alt={id} />
);

// Tiny inline icons (24px viewBox). All use currentColor where possible.
const Icon = {
  home: ({ active }) => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z"
        stroke="currentColor" strokeWidth={active ? 1.9 : 1.6} strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
    </svg>
  ),
  mood: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M8 14a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>
    </svg>
  ),
  breath: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
  ),
  journal: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M8 10h8M8 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  profile: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  bell: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="#3C4A55" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M10 18a2 2 0 1 0 4 0" stroke="#3C4A55" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  back: () => (
    <svg viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#1E2A33" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  more: () => (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="#3C4A55"/><circle cx="12" cy="12" r="1.6" fill="#3C4A55"/><circle cx="19" cy="12" r="1.6" fill="#3C4A55"/></svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#647C50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  arrow: () => (
    <svg viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  play: () => (
    <svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7V5Z" fill="currentColor"/></svg>
  ),
  pause: () => (
    <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>
  ),
  moon: () => (
    <svg viewBox="0 0 24 24" fill="none"><path d="M20 14a8 8 0 0 1-11-10 8 8 0 1 0 11 10Z" stroke="#A37F36" strokeWidth="1.6" strokeLinejoin="round" fill="#FBEFCE"/></svg>
  ),
  sun: () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.5" fill="#E7B860"/>
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6" stroke="#A37F36" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  leaf: () => (
    <svg viewBox="0 0 24 24" fill="none"><path d="M5 19c0-9 7-15 16-15 0 9-6 16-15 16-1 0-1-1-1-1Z" fill="#DDE5D2" stroke="#647C50" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 19c4-4 8-7 13-11" stroke="#647C50" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  heart: () => (
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" fill="#FBE9DF" stroke="#B5613E" strokeWidth="1.5" strokeLinejoin="round"/></svg>
  ),
  spark: () => (
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" stroke="#A37F36" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
};

// Bottom navigation
function BottomNav({ active }) {
  const items = [
    { id: 'home',    lbl: 'Beranda',  Ic: Icon.home },
    { id: 'mood',    lbl: 'Suasana',  Ic: Icon.mood },
    { id: 'breath',  lbl: 'Napas',    Ic: Icon.breath },
    { id: 'journal', lbl: 'Jurnal',   Ic: Icon.journal },
    { id: 'profile', lbl: 'Saya',     Ic: Icon.profile },
  ];
  return (
    <div className="app-bottomnav">
      {items.map(it => (
        <div key={it.id} className={'item' + (active === it.id ? ' active' : '')}>
          <it.Ic active={active === it.id} />
          <div className="lbl">{it.lbl}</div>
        </div>
      ))}
    </div>
  );
}

function Topbar({ greet, sub, translucent }) {
  return (
    <div className={'app-topbar' + (translucent ? ' translucent' : '')}>
      <div className="greet">{greet}<span className="sub">{sub}</span></div>
      <button className="icon-btn" aria-label="notifications"><Icon.bell /></button>
    </div>
  );
}

function NavBar({ title, onBack = true, action }) {
  return (
    <div style={{
      padding: '56px 14px 12px',
      display: 'flex', alignItems: 'center', gap: 8,
      position: 'sticky', top: 0, zIndex: 5, background: 'var(--krem-50)',
    }}>
      {onBack && <button className="icon-btn" style={{ background: 'white' }}><Icon.back /></button>}
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--fg-1)',
        flex: 1, textAlign: 'center', paddingRight: onBack ? 38 : 0,
      }}>{title}</div>
      {action || <button className="icon-btn" style={{ background: 'transparent', boxShadow: 'none' }}><Icon.more /></button>}
    </div>
  );
}

Object.assign(window, { MoodGlyph, Icon, BottomNav, Topbar, NavBar });

})();
