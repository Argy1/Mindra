/* ============================================================
   Mindra UI Kit — Screens
   ============================================================ */

(() => {

const { MoodGlyph, Icon, BottomNav, Topbar, NavBar } = window;

/* ---------- 1. Onboarding / Welcome ---------- */
function ScreenWelcome() {
  return (
    <div className="screen">
      <div className="onb-hero">
        <img className="orb-deco" src="../../assets/illustration-orb.svg" alt="" />
        <div style={{ position: 'absolute', top: 56, left: 24 }}>
          <img src="../../assets/logo-mindra.svg" style={{ height: 26 }} alt="Mindra" />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1.1, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
            Halo.<br/><span style={{ fontStyle: 'italic' }}>Senang kamu</span><br/>di sini.
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--fg-3)', lineHeight: 1.6, marginTop: 16, maxWidth: 280 }}>
            Mindra menemanimu pelan-pelan — satu napas, satu catatan, satu hari pada satu waktu.
          </p>
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 24, right: 24, bottom: 50, zIndex: 5,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <button className="m-btn primary lg full">Mulai pelan-pelan</button>
        <button className="m-btn ghost full">Sudah punya akun</button>
      </div>
    </div>
  );
}

/* ---------- 2. Home ---------- */
function ScreenHome() {
  return (
    <div className="screen">
      <div className="screen-scroll" style={{ padding: 0 }}>
        <Topbar greet="Selamat sore, Ayu" sub="JUMAT · 21 MEI" />
        <div style={{ padding: '0 20px 110px' }}>
          {/* Mood prompt card */}
          <div className="m-card hero" style={{ padding: 20 }}>
            <div className="m-eyebrow">Tarik napas dulu</div>
            <div className="m-title" style={{ marginTop: 8 }}>Apa yang kamu rasakan sekarang?</div>
            <div className="mood-row" style={{ marginTop: 16 }}>
              <div className="mood-cell"><MoodGlyph id="tenang" size={42}/><div className="lbl">Tenang</div></div>
              <div className="mood-cell selected"><MoodGlyph id="syukur" size={42}/><div className="lbl">Syukur</div></div>
              <div className="mood-cell"><MoodGlyph id="bahagia" size={42}/><div className="lbl">Bahagia</div></div>
              <div className="mood-cell"><MoodGlyph id="hangat" size={42}/><div className="lbl">Hangat</div></div>
            </div>
            <button className="m-btn ghost" style={{ marginTop: 8, padding: '8px 0', justifyContent: 'flex-start' }}>
              Lihat semua suasana →
            </button>
          </div>

          {/* Today's practice */}
          <div className="section-h">
            <div className="t">Hari ini untukmu</div>
            <div className="a">Atur ulang</div>
          </div>
          <div className="m-card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'radial-gradient(circle at 35% 35%, #D6E2EC, #84A7C1 60%, #437094)',
              flexShrink: 0,
              boxShadow: '0 6px 16px rgba(67,112,148,0.25)',
            }} />
            <div style={{ flex: 1 }}>
              <div className="m-eyebrow">Latihan singkat</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--fg-1)', marginTop: 4, lineHeight: 1.2 }}>
                Napas 4-7-8
              </div>
              <div className="m-meta" style={{ marginTop: 4 }}>
                5 menit <span className="sep"/> pemula <span className="sep"/> tanpa suara
              </div>
            </div>
            <button className="icon-btn" style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--biru-500)', color: '#FBF8F2', border: 'none',
              display: 'grid', placeItems: 'center',
            }}>
              <span style={{ width: 18, height: 18, display: 'block', color: '#FBF8F2' }}><Icon.play /></span>
            </button>
          </div>

          {/* Streak */}
          <div className="m-card warm" style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'white',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--hangat-700)' }}>12</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>
                Dua belas hari berturut-turut.
              </div>
              <div className="m-body" style={{ marginTop: 2, fontSize: 12 }}>Pelan-pelan, kamu hadir untuk diri sendiri.</div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="section-h">
            <div className="t">Untuk sore yang tenang</div>
            <div className="a">Lihat semua</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <RecRow icon="sun" tint="gold" title="Tiga kalimat sebelum tidur" meta="Jurnal · 4 menit" />
            <RecRow icon="leaf" tint="sage" title="Body scan untuk melepaskan hari" meta="Meditasi · 12 menit" />
            <RecRow icon="moon" tint="warm" title="Suara hujan di pegunungan" meta="Soundscape · 30 menit" />
          </div>
        </div>
      </div>
      <BottomNav active="home" />
    </div>
  );
}

function RecRow({ icon, tint, title, meta }) {
  const Ic = Icon[icon] || Icon.leaf;
  return (
    <div className="m-row" style={{ background: 'white', padding: '12px 14px', borderRadius: 16, border: 'none', boxShadow: 'var(--shadow-xs)' }}>
      <div className={'icn ' + tint}><Ic /></div>
      <div className="meta">
        <div className="t">{title}</div>
        <div className="d">{meta}</div>
      </div>
      <div className="arr" style={{ width: 18 }}><Icon.arrow /></div>
    </div>
  );
}

/* ---------- 3. Mood check-in ---------- */
function ScreenMood() {
  const moods = ['tenang','syukur','bahagia','hangat','lelah','sedih','cemas'];
  return (
    <div className="screen">
      <NavBar title="Catatan suasana" />
      <div className="screen-scroll" style={{ paddingTop: 0 }}>
        <div className="m-quote" style={{ padding: '8px 4px 18px' }}>
          "Tidak ada perasaan yang salah. Hanya perlu didengar."
        </div>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 10 }}>
          Pilih satu yang paling dekat
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {moods.map((m, i) => (
            <div key={m} className={'mood-cell' + (i === 1 ? ' selected' : '')} style={{ background: i === 1 ? 'var(--sage-50)' : 'white', boxShadow: i === 1 ? '0 0 0 1.5px var(--sage-300) inset' : 'var(--shadow-xs)' }}>
              <MoodGlyph id={m} size={44}/>
              <div className="lbl" style={{ textTransform: 'capitalize' }}>{m}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>
          Seberapa terasa?
        </div>
        <div style={{ marginTop: 12, position: 'relative', padding: '20px 0' }}>
          <div style={{ height: 8, background: 'linear-gradient(to right, #DDE5D2, #9DB287, #647C50)', borderRadius: 999 }}/>
          <div style={{
            position: 'absolute', top: 11, left: '62%',
            width: 26, height: 26, borderRadius: '50%', background: 'white',
            boxShadow: 'var(--shadow-md), 0 0 0 4px rgba(67,112,148,0.18)',
            border: '2px solid var(--sage-500)',
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <span>Lembut</span><span>Sedang</span><span>Kuat</span>
        </div>

        <div style={{ marginTop: 26, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>
          Apa yang sedang terjadi?
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {['Keluarga','Pekerjaan','Kesehatan','Pertemanan','Uang','Diri sendiri','Tidur','Lainnya'].map((t, i) => (
            <span key={t} className={'m-pill' + (i === 1 || i === 5 ? ' tint' : '')}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 36, zIndex: 5 }}>
        <button className="m-btn primary lg full">Simpan catatan</button>
      </div>
    </div>
  );
}

/* ---------- 4. Breath session ---------- */
function ScreenBreath() {
  return (
    <div className="screen" style={{
      background: 'linear-gradient(170deg, #294660 0%, #437094 50%, #5E89A8 100%)',
      color: '#FBF8F2',
    }}>
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="icon-btn" style={{ background: 'rgba(255,255,255,0.18)', color: '#FBF8F2', boxShadow: 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}><path d="M15 5l-7 7 7 7" stroke="#FBF8F2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(251,248,242,0.7)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Napas 4-7-8
        </div>
        <div style={{ width: 38 }}/>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '0 20px 80px' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(251,248,242,0.65)' }}>
          Tarik napas
        </div>
        <div className="orb" style={{
          width: 240, height: 240,
          background: 'radial-gradient(circle at 38% 30%, rgba(251,248,242,0.95) 0%, #B0C7DA 35%, #84A7C1 70%, #5E89A8 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.2), 0 0 0 24px rgba(251,248,242,0.10), 0 0 0 56px rgba(251,248,242,0.05)',
          color: 'rgba(30,42,51,0.55)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 1, fontWeight: 400 }}>4</div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'rgba(251,248,242,0.92)', textAlign: 'center', lineHeight: 1.3, maxWidth: 280 }}>
          biarkan udara mengisi<br/>perutmu pelan-pelan
        </div>

        <div style={{ width: '100%', maxWidth: 280, marginTop: 8 }}>
          <div style={{ height: 4, background: 'rgba(251,248,242,0.2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '42%', background: '#FBF8F2', borderRadius: 999 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'rgba(251,248,242,0.7)' }}>
            <span>2:08</span><span>5:00</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center', gap: 14 }}>
        <button style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(251,248,242,0.18)', backdropFilter: 'blur(20px)',
          border: 'none', color: '#FBF8F2', display: 'grid', placeItems: 'center',
        }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}><path d="M4 12h16M4 6h16M4 18h12" stroke="#FBF8F2" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </button>
        <button style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#FBF8F2', color: 'var(--biru-700)',
          border: 'none', display: 'grid', placeItems: 'center',
          boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
        }}>
          <span style={{ width: 26, height: 26, display: 'block', color: 'var(--biru-700)' }}><Icon.pause /></span>
        </button>
        <button style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(251,248,242,0.18)', backdropFilter: 'blur(20px)',
          border: 'none', color: '#FBF8F2', display: 'grid', placeItems: 'center',
        }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}><path d="M19 3v6h-6M5 21v-6h6M20 8a8 8 0 0 0-14-3M4 16a8 8 0 0 0 14 3" stroke="#FBF8F2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ---------- 5. Journal ---------- */
function ScreenJournal() {
  return (
    <div className="screen">
      <NavBar title="Refleksi malam" action={
        <button className="m-pill tint" style={{ fontSize: 12 }}>Simpan</button>
      } />
      <div className="screen-scroll" style={{ paddingTop: 0 }}>
        <div className="m-meta" style={{ marginBottom: 14 }}>
          JUMAT, 21 MEI · 20.42 WIB
        </div>

        <div className="journal-paper">
          <div className="journal-prompt">
            Tiga kalimat untuk menutup hari. Apa yang baik, apa yang berat, apa yang kamu syukuri.
          </div>
          <div className="journal-text">
            Hari ini panjang tapi tidak buruk. Rapat sore lebih ringan dari yang aku bayangkan. Aku bersyukur Ibu menelepon — suaranya selalu membuat dada lebih lega.
            <span style={{ display: 'inline-block', width: 2, height: 18, background: 'var(--biru-500)', verticalAlign: 'middle', marginLeft: 2, animation: 'blink 1.1s steps(2) infinite' }}/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <span className="m-pill"><MoodGlyph id="syukur" size={16}/> Syukur</span>
          <span className="m-pill">Keluarga</span>
          <span className="m-pill">+ tambah tag</span>
        </div>

        <div style={{ marginTop: 22 }}>
          <div className="section-h" style={{ marginTop: 0 }}><div className="t" style={{ fontSize: 17 }}>Catatan sebelumnya</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PastNote date="Kamis, 20 Mei" mood="tenang" text="Pagi yang lambat. Kopi sambil baca, tanpa scrolling…" />
            <PastNote date="Rabu, 19 Mei" mood="cemas" text="Deadline besok. Tarik napas dalam. Satu hal pada satu waktu…" />
          </div>
        </div>
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

function PastNote({ date, mood, text }) {
  return (
    <div className="m-card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <MoodGlyph id={mood} size={32}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--fg-4)', letterSpacing: '0.02em' }}>{date}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 3, lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</div>
      </div>
    </div>
  );
}

/* ---------- 6. Library / Explore ---------- */
function ScreenLibrary() {
  return (
    <div className="screen">
      <div className="screen-scroll" style={{ padding: 0 }}>
        <Topbar greet="Jelajahi" sub="LATIHAN, SUARA & BACAAN" />
        <div style={{ padding: '0 20px 110px' }}>
          {/* Search bar */}
          <div style={{
            background: 'white', borderRadius: 14, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-xs)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}><circle cx="11" cy="11" r="6" stroke="#8E99A4" strokeWidth="1.6"/><path d="M16 16l4 4" stroke="#8E99A4" strokeWidth="1.6" strokeLinecap="round"/></svg>
            <div style={{ flex: 1, fontSize: 14, color: 'var(--fg-4)' }}>Cari "napas" atau "tidur"</div>
          </div>

          {/* Categories */}
          <div className="section-h" style={{ marginTop: 22 }}><div className="t">Kategori</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <CatTile bg="var(--biru-50)" iconBg="var(--biru-200)" title="Napas" count="12 latihan" icon="breath" tint="var(--biru-700)" />
            <CatTile bg="var(--sage-50)" iconBg="var(--sage-200)" title="Tidur" count="9 latihan" icon="moon" tint="var(--sage-700)" />
            <CatTile bg="var(--hangat-100)" iconBg="#F1B89C" title="Cemas" count="14 latihan" icon="heart" tint="var(--hangat-700)" />
            <CatTile bg="var(--matahari-100)" iconBg="#F0D387" title="Pagi" count="8 latihan" icon="sun" tint="var(--matahari-700)" />
          </div>

          <div className="section-h"><div className="t">Untuk pemula</div><div className="a">Lihat semua</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PracticeRow title="Napas pelan 5 menit" meta="Pemula · 5 menit · gratis" icon="breath" tint="biru-100" iconColor="var(--biru-700)" />
            <PracticeRow title="Body scan singkat" meta="Pemula · 8 menit" icon="leaf" tint="sage-100" iconColor="var(--sage-700)" badge="GRATIS" />
            <PracticeRow title="Melepaskan hari yang berat" meta="Pemula · 12 menit" icon="moon" tint="warm" iconColor="var(--hangat-700)" />
            <PracticeRow title="Tiga hal yang baik" meta="Jurnal · 4 menit" icon="spark" tint="gold" iconColor="var(--matahari-700)" />
          </div>
        </div>
      </div>
      <BottomNav active="breath" />
    </div>
  );
}

function CatTile({ bg, iconBg, title, count, icon, tint }) {
  const Ic = Icon[icon];
  return (
    <div style={{ background: bg, borderRadius: 18, padding: 16, minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: iconBg, display: 'grid', placeItems: 'center', color: tint }}>
        <Ic />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--fg-1)', lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2, letterSpacing: '0.02em' }}>{count}</div>
      </div>
    </div>
  );
}

function PracticeRow({ title, meta, icon, tint, iconColor, badge }) {
  const Ic = Icon[icon];
  return (
    <div className="m-row" style={{ background: 'white', padding: '12px 14px', borderRadius: 14, border: 'none', boxShadow: 'var(--shadow-xs)' }}>
      <div className={'icn ' + tint} style={{ color: iconColor }}><Ic /></div>
      <div className="meta">
        <div className="t">{title}</div>
        <div className="d">{meta}</div>
      </div>
      {badge && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--sage-700)', background: 'var(--sage-100)', padding: '4px 8px', borderRadius: 6 }}>{badge}</span>}
    </div>
  );
}

/* ---------- 7. Profile / Progress ---------- */
function ScreenProfile() {
  const days = ['S','S','R','K','J','S','M'];
  const grid = [1,1,1,1,0,1,1, 1,1,1,1,1,0,1, 1,1,1,1,1,1,2, 0,0,0,0,0,0,0];
  return (
    <div className="screen">
      <div className="screen-scroll" style={{ padding: 0 }}>
        <div style={{ padding: '56px 20px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--hangat-300), var(--matahari-500))',
            display: 'grid', placeItems: 'center', color: 'white',
            fontFamily: 'var(--font-display)', fontSize: 26,
          }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--fg-1)' }}>Ayu</div>
            <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>Bergabung sejak April 2026</div>
          </div>
          <button className="icon-btn"><Icon.more /></button>
        </div>

        <div style={{ padding: '12px 20px 110px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <Stat label="Hari aktif" value="12" tone="hangat" />
            <Stat label="Sesi total" value="38" tone="biru" />
            <Stat label="Menit tenang" value="284" tone="sage" />
          </div>

          {/* Streak grid */}
          <div className="m-card" style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--fg-1)' }}>Empat minggu terakhir</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>Mei 2026</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 14 }}>
              {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--fg-4)', letterSpacing: '0.04em' }}>{d}</div>)}
              {grid.map((v, i) => (
                <div key={i} className={'streak-day' + (v === 1 ? ' done' : v === 2 ? ' today' : '')}>
                  {v === 2 ? <span style={{ width: 13, color: 'var(--biru-700)' }}><Icon.check /></span> : ''}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--fg-2)' }}>
              "Sedikit demi sedikit, hadir untuk diri sendiri."
            </div>
          </div>

          {/* Settings list */}
          <div className="section-h"><div className="t">Pengaturan</div></div>
          <div className="m-card" style={{ padding: '4px 16px' }}>
            <SettingRow icon="bell" label="Pengingat lembut" detail="Setiap hari, 20.00 WIB" />
            <SettingRow icon="sun" label="Tampilan" detail="Ikut sistem" />
            <SettingRow icon="leaf" label="Bahasa" detail="Bahasa Indonesia" />
            <SettingRow icon="heart" label="Privasi" detail="Catatanmu tersimpan lokal" />
          </div>

          {/* Crisis card */}
          <div className="m-card" style={{
            marginTop: 14,
            background: 'var(--biru-800)',
            color: 'var(--fg-on-dark)',
            padding: 18,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(251,248,242,0.7)', textTransform: 'uppercase' }}>Butuh teman bicara</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 8, lineHeight: 1.3 }}>
              Kalau hari ini terasa terlalu berat, kami bantu sambungkan.
            </div>
            <button className="m-btn" style={{ marginTop: 14, background: '#FBF8F2', color: 'var(--biru-800)' }}>Lihat layanan dukungan</button>
          </div>
        </div>
      </div>
      <BottomNav active="profile" />
    </div>
  );
}

function Stat({ label, value, tone }) {
  const bg = { hangat: 'var(--hangat-100)', biru: 'var(--biru-50)', sage: 'var(--sage-50)' }[tone];
  const fg = { hangat: 'var(--hangat-700)', biru: 'var(--biru-700)', sage: 'var(--sage-700)' }[tone];
  return (
    <div style={{ background: bg, borderRadius: 16, padding: '14px 12px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: fg, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 6, letterSpacing: '0.02em' }}>{label}</div>
    </div>
  );
}

function SettingRow({ icon, label, detail }) {
  const Ic = Icon[icon];
  return (
    <div className="m-row" style={{ padding: '14px 0' }}>
      <div className="icn" style={{ background: 'var(--krem-100)', color: 'var(--fg-2)' }}><Ic /></div>
      <div className="meta">
        <div className="t">{label}</div>
        <div className="d">{detail}</div>
      </div>
      <div style={{ width: 16, color: 'var(--fg-4)' }}><Icon.arrow /></div>
    </div>
  );
}

Object.assign(window, {
  ScreenWelcome, ScreenHome, ScreenMood, ScreenBreath, ScreenJournal, ScreenLibrary, ScreenProfile,
});

})();
