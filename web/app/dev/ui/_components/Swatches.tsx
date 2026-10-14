import Image from 'next/image';

interface Palette {
  name: string;
  prefix: string;
  steps: Array<number | string>;
}

const BRAND: Palette[] = [
  {
    name: 'Biru Tenang · primary',
    prefix: 'biru',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  {
    name: 'Hijau Sage · secondary',
    prefix: 'sage',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  {
    name: 'Abu Hangat · neutral (550 = tambahan web)',
    prefix: 'neutral',
    steps: [50, 100, 200, 300, 400, 500, 550, 600, 700, 800, 900],
  },
  {
    name: 'Kuning Matahari · aksen',
    prefix: 'matahari',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
];

const SEMANTIC: Palette[] = [
  { name: 'Success', prefix: 'success', steps: [50, 100, 200, 300, 500, 700, 900] },
  { name: 'Warning', prefix: 'warning', steps: [50, 100, 200, 500, 700, 900] },
  {
    name: 'Danger · hanya krisis & galat',
    prefix: 'danger',
    steps: [50, 100, 200, 300, 500, 700, 900],
  },
  { name: 'Info', prefix: 'info', steps: [50, 100, 200, 300, 500, 700, 900] },
];

const MOODS = ['tenang', 'syukur', 'bahagia', 'hangat', 'lelah', 'sedih', 'cemas'] as const;

function PaletteRow({ palette }: { palette: Palette }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-fg-1">{palette.name}</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2">
        {palette.steps.map((step) => (
          <li key={step} className="grid gap-1">
            <span
              className="block h-12 rounded-md border border-line-soft"
              style={{ background: `var(--${palette.prefix}-${step})` }}
            />
            <span className="meta num">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kotak warna token + 7 glyph mood, untuk memeriksa pemetaan tokens.css → tema. */
export function Swatches() {
  return (
    <>
      {[...BRAND, ...SEMANTIC].map((palette) => (
        <PaletteRow key={palette.prefix} palette={palette} />
      ))}

      <div className="grid gap-2">
        <p className="text-sm font-semibold text-fg-1">Mood · 7 kerikil</p>
        <ul className="flex flex-wrap gap-4">
          {MOODS.map((mood) => (
            <li key={mood} className="grid justify-items-center gap-1.5">
              <Image
                src={`/assets/mood/${mood}.svg`}
                alt=""
                width={44}
                height={40}
                className="h-auto w-11"
              />
              <span className="meta capitalize">{mood}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
