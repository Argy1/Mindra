/**
 * Diagram ekosistem landing (design/landing.html `.eco`): "Kamu" di tengah, empat pihak sebagai
 * kerikil di sekelilingnya. Garis penuh = terhubung dengan izin aktif, putus-putus rapat = hanya
 * data anonim, titik-titik = belum terhubung (menunggu persetujuanmu).
 *
 * Gambar ini hiasan sekaligus penjelasan, jadi maknanya ditulis lengkap di `figcaption` untuk
 * pembaca layar dan SVG-nya disembunyikan (`aria-hidden`). Animasi ada di app/globals.css (§6) dan
 * mati bila pengguna meminta gerak dikurangi.
 */
export function EcosystemDiagram() {
  return (
    <figure className="eco" aria-labelledby="eco-cap">
      <figcaption id="eco-cap" className="sr-only">
        Diagram: data kamu terhubung ke psikolog dan keluarga dengan izin aktif, ke puskesmas hanya
        sebagai data anonim, dan ke SATUSEHAT setelah kamu setujui.
      </figcaption>
      <svg viewBox="40 40 440 410" aria-hidden="true" focusable="false">
        {/* benang */}
        <path className="thread thread--on" d="M260 240 C 200 170, 150 130, 112 96" />
        <path className="thread thread--on thread--on-2" d="M260 240 C 330 180, 380 140, 418 104" />
        <path className="thread thread--anon" d="M260 240 C 210 320, 160 360, 110 392" />
        <path className="thread thread--off" d="M260 240 C 320 320, 370 360, 414 392" />
        <circle
          className="pulse"
          r="5"
          style={{ offsetPath: "path('M260 240 C 200 170, 150 130, 112 96')" }}
        />

        {/* simpul: kerikil */}
        <g transform="translate(112 96)">
          <path
            d="M-40 -6 C -40 -30, -18 -38, 2 -36 C 26 -34, 42 -22, 40 0 C 38 24, 18 34, -4 34 C -26 34, -40 18, -40 -6 Z"
            fill="var(--biru-100)"
          />
          <text className="node-label" x="0" y="58" textAnchor="middle">
            Psikolog
          </text>
          <text className="node-sub" x="0" y="76" textAnchor="middle">
            izin aktif
          </text>
        </g>
        <g transform="translate(418 104)">
          <path
            d="M-38 -2 C -40 -26, -16 -36, 4 -34 C 28 -32, 40 -16, 38 4 C 36 26, 14 34, -6 32 C -26 30, -36 18, -38 -2 Z"
            fill="var(--sage-100)"
          />
          <text className="node-label" x="0" y="56" textAnchor="middle">
            Keluarga
          </text>
          <text className="node-sub" x="0" y="74" textAnchor="middle">
            sesuai izinmu
          </text>
        </g>
        <g transform="translate(110 392)">
          <path
            d="M-40 0 C -40 -22, -20 -32, 0 -32 C 24 -32, 40 -18, 40 2 C 40 22, 22 32, 0 32 C -22 32, -40 22, -40 0 Z"
            fill="var(--neutral-100)"
          />
          <text className="node-label" x="0" y="56" textAnchor="middle">
            Puskesmas
          </text>
          <text className="node-sub" x="0" y="74" textAnchor="middle">
            data anonim saja
          </text>
        </g>
        <g transform="translate(414 392)">
          <path
            d="M-36 2 C -38 -20, -18 -32, 4 -30 C 26 -28, 38 -14, 36 4 C 34 24, 16 32, -4 32 C -24 32, -34 20, -36 2 Z"
            fill="var(--neutral-100)"
            stroke="var(--neutral-300)"
            strokeDasharray="3 5"
          />
          <text className="node-label" x="0" y="56" textAnchor="middle">
            SATUSEHAT
          </text>
          <text className="node-sub" x="0" y="74" textAnchor="middle">
            menunggu persetujuanmu
          </text>
        </g>

        {/* pusat: kamu */}
        <g transform="translate(260 240)">
          <path
            d="M-70 -8 C -72 -52, -30 -70, 6 -66 C 46 -62, 72 -36, 70 2 C 68 44, 32 64, -6 62 C -44 60, -68 34, -70 -8 Z"
            fill="var(--sage-400)"
          />
          <ellipse cx="-26" cy="-34" rx="16" ry="7" fill="#fff" opacity=".28" />
          <text className="node-you" x="0" y="8" textAnchor="middle">
            Kamu
          </text>
        </g>
      </svg>
    </figure>
  );
}
