interface ApiExampleProps {
  /** Alamat situs tanpa garis miring di ujung (dari NEXT_PUBLIC_SITE_URL). */
  baseUrl: string;
}

type Kind = 'plain' | 'comment' | 'key' | 'string';
type Line = ReadonlyArray<readonly [Kind, string]>;

/** Warna token: semuanya ≥ 4,5:1 di atas neutral-900 (skala yang sama dengan halaman /developers). */
const KIND_CLASS: Record<Kind, string> = {
  plain: '',
  comment: 'text-neutral-400',
  key: 'text-biru-200',
  string: 'text-sage-200',
};

function exampleLines(baseUrl: string): readonly Line[] {
  return [
    [['comment', '# Hasil skrining sebagai FHIR Observation (respons dipersingkat)']],
    [
      ['plain', 'curl '],
      ['string', `"${baseUrl}/api/v1/fhir/Observation?patient=me&_count=1"`],
      ['plain', ' \\'],
    ],
    [
      ['plain', '  -H '],
      ['string', '"Authorization: Bearer $TOKEN"'],
    ],
    [],
    [['plain', '{']],
    [
      ['plain', '  '],
      ['key', '"resourceType"'],
      ['plain', ': '],
      ['string', '"Bundle"'],
      ['plain', ','],
    ],
    [
      ['plain', '  '],
      ['key', '"type"'],
      ['plain', ': '],
      ['string', '"searchset"'],
      ['plain', ','],
    ],
    [
      ['plain', '  '],
      ['key', '"entry"'],
      ['plain', ': [{ '],
      ['key', '"resource"'],
      ['plain', ': {'],
    ],
    [
      ['plain', '    '],
      ['key', '"resourceType"'],
      ['plain', ': '],
      ['string', '"Observation"'],
      ['plain', ','],
    ],
    [
      ['plain', '    '],
      ['key', '"code"'],
      ['plain', ': { '],
      ['key', '"coding"'],
      ['plain', ': [{'],
    ],
    [
      ['plain', '      '],
      ['key', '"system"'],
      ['plain', ': '],
      ['string', '"http://loinc.org"'],
      ['plain', ','],
    ],
    [
      ['plain', '      '],
      ['key', '"code"'],
      ['plain', ': '],
      ['string', '"44261-6"'],
    ],
    [['plain', '    }] },']],
    [
      ['plain', '    '],
      ['key', '"valueInteger"'],
      ['plain', ': 11'],
    ],
    [['plain', '  }}]']],
    [['plain', '}']],
  ];
}

/**
 * Contoh permintaan + respons untuk bagian "Terbuka untuk sistem lain". Bentuk respons sama
 * dengan GET /api/v1/fhir/Observation, dipersingkat (tanpa link, fullUrl, identifier, subject,
 * dan interpretation). Kode LOINC 44261-6 = PHQ-9 total score (lib/domain/fhir/observation.ts).
 */
export function ApiExample({ baseUrl }: ApiExampleProps) {
  return (
    <pre
      role="group"
      aria-label="Contoh permintaan API"
      tabIndex={0}
      className="overflow-x-auto rounded-lg bg-neutral-900 p-6 font-mono text-[0.8125rem] leading-[1.7] text-neutral-50"
    >
      <code className="bg-transparent p-0 text-inherit">
        {exampleLines(baseUrl).map((line, index) => (
          // Daftar tetap dan tidak pernah berubah urutan, jadi indeks aman sebagai kunci.
          <span key={index} className="block min-h-[1.7em]">
            {line.map(([kind, text], part) => (
              <span key={part} className={KIND_CLASS[kind]}>
                {text}
              </span>
            ))}
          </span>
        ))}
      </code>
    </pre>
  );
}
