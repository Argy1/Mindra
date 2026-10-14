import type { Metadata } from 'next';
import { DownloadSimple, ShieldCheck } from '@phosphor-icons/react/ssr';
import { CodeBlock } from '@/components/features/developers/CodeBlock';
import { EndpointSection } from '@/components/features/developers/EndpointSection';
import { Container } from '@/components/layout/Container';
import { Alert } from '@/components/ui/Alert';
import { ANCHOR, groupOperations } from '@/lib/api/docs';
import { API_ERROR_STATUS, DEFAULT_ERROR_MESSAGE, type ApiErrorCode } from '@/lib/api/errors';
import { RATE_RULES } from '@/lib/api/handler';
import { API_ROUTES, currentOpenApiDocument, serverUrl } from '@/lib/api/routes';

export const metadata: Metadata = {
  title: 'API untuk pengembang',
  description:
    'Dokumentasi API Mindra: skrining, catatan mood dan tidur, hasil dalam FHIR R4, SATUSEHAT, dan agregat anonim untuk mitra.',
};

const ENVELOPE_EXAMPLE = `// Sukses
{ "data": { ... }, "error": null }

// Daftar berpaginasi
{ "data": [ ... ], "error": null, "meta": { "nextCursor": "eyJ0Ijoi..." } }

// Galat
{ "data": null, "error": { "code": "validation_failed", "message": "Permintaan tidak lolos validasi.",
  "issues": [{ "path": "answers", "message": "..." }] } }`;

const perMinute = (rule: { limit: number }) => `${rule.limit} permintaan per menit`;

export default function DevelopersPage() {
  const baseUrl = serverUrl();
  const groups = groupOperations(currentOpenApiDocument());
  const configOf = new Map(API_ROUTES.map((route) => [route.config.operationId, route.config]));
  const errorCodes = Object.keys(API_ERROR_STATUS) as ApiErrorCode[];
  const th = 'px-3 pb-2 text-left text-xs font-semibold text-fg-4';
  const td = 'border-t border-line-soft px-3 py-2.5 align-top text-sm';

  return (
    <Container className="pt-12 pb-24">
      <header className="max-w-[62ch]">
        <p className="meta">Untuk pengembang</p>
        <h1 className="mt-1 display-3">API Mindra</h1>
        <p className="mt-3 lead">
          Kirim jawaban skrining, baca catatan mood dan tidur, ambil hasilnya sebagai FHIR R4, kirim
          ke SATUSEHAT atas persetujuan pengguna, atau tarik agregat anonim untuk wilayahmu. Aturan
          yang sama dengan aplikasi web dan mobile Mindra.
        </p>
        <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <a
            href="/api/v1/openapi.json"
            className="inline-flex items-center gap-1.5 font-semibold text-biru-600"
          >
            <DownloadSimple aria-hidden className="size-5" />
            Spesifikasi OpenAPI 3.1 (JSON)
          </a>
          <span className="meta">Server: {baseUrl}</span>
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 items-start gap-10 wide:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="Daftar endpoint" className="wide:sticky wide:top-6">
          <details className="rounded-lg bg-raised px-4 py-3 shadow-xs wide:hidden">
            <summary className="cursor-pointer font-semibold text-fg-1">Daftar endpoint</summary>
            <EndpointList groups={groups} />
          </details>
          <div className="hidden wide:block">
            <p className="mb-3 text-xs font-semibold text-fg-4">Daftar endpoint</p>
            <EndpointList groups={groups} />
          </div>
        </aside>

        <div className="grid min-w-0 grid-cols-1 gap-12">
          <section aria-labelledby="mulai" className="grid grid-cols-1 gap-5">
            <h2 id="mulai" className="h2">
              Mulai cepat
            </h2>

            <div className="grid grid-cols-1 gap-5 wide:grid-cols-2">
              <div>
                <h3 className="mb-1.5 h3">Autentikasi</h3>
                <p className="body-m">
                  Dua jenis kredensial, tidak pernah dari cookie. Semua kegagalan menjawab sama,{' '}
                  <code className="font-mono">401 unauthorized</code>, supaya penyerang tidak bisa
                  membedakan token salah, kunci dicabut, atau kunci tidak ada.
                </p>
                <ul className="mt-2 grid list-disc gap-1.5 pl-5 body-m">
                  <li>
                    <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>: token
                    akses Supabase milik pengguna. Semua kueri berjalan di bawah izin pemilik token.
                  </li>
                  <li>
                    <code className="font-mono">X-API-Key: mk_live_…</code>: kunci sistem mitra,
                    dibuat admin faskes di portal. Hanya hash-nya yang kami simpan.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="mb-1.5 h3">Format respons</h3>
                <CodeBlock label="Format respons" code={ENVELOPE_EXAMPLE} />
                <p className="mt-2 meta">
                  Pengecualian: <code className="font-mono">/fhir/*</code> mengembalikan sumber daya
                  FHIR mentah (<code className="font-mono">application/fhir+json</code>) dan galat
                  sebagai OperationOutcome.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 wide:grid-cols-2">
              <div>
                <h3 className="mb-2 h3">Batas laju</h3>
                <div role="group" aria-label="Batas laju" tabIndex={0} className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <caption className="sr-only">Batas laju per jenis permintaan</caption>
                    <thead>
                      <tr>
                        <th scope="col" className={th}>
                          Siapa
                        </th>
                        <th scope="col" className={th}>
                          Batas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Semua rute, per IP', perMinute(RATE_RULES.ip)],
                        ['Rute publik, per IP', perMinute(RATE_RULES.public)],
                        ['Pengguna, membaca', perMinute(RATE_RULES.userRead)],
                        ['Pengguna, menulis', perMinute(RATE_RULES.userWrite)],
                        ['Kunci API', perMinute(RATE_RULES.apiKey)],
                      ].map(([who, limit]) => (
                        <tr key={who}>
                          <th scope="row" className={`${td} text-left font-normal text-fg-1`}>
                            {who}
                          </th>
                          <td className={td}>{limit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 meta">
                  Header <code className="font-mono">X-RateLimit-*</code> ada di setiap respons;
                  saat 429 ada <code className="font-mono">Retry-After</code> (detik).
                </p>
              </div>

              <div>
                <h3 className="mb-2 h3">Kode galat</h3>
                <div role="group" aria-label="Kode galat" tabIndex={0} className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <caption className="sr-only">Kode galat dan artinya</caption>
                    <thead>
                      <tr>
                        <th scope="col" className={th}>
                          HTTP
                        </th>
                        <th scope="col" className={th}>
                          Kode
                        </th>
                        <th scope="col" className={th}>
                          Arti
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorCodes.map((code) => (
                        <tr key={code}>
                          <th scope="row" className={`${td} text-left font-mono font-semibold`}>
                            {API_ERROR_STATUS[code]}
                          </th>
                          <td className={`${td} font-mono`}>{code}</td>
                          <td className={`${td} text-fg-2`}>{DEFAULT_ERROR_MESSAGE[code]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <Alert
              tone="info"
              icon={<ShieldCheck />}
              title="Aturan yang tidak bisa ditawar"
              titleAs="h3"
            >
              <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-sm">
                <li>
                  Skor dan kategori <strong>selalu dihitung server</strong>. Skor kiriman klien
                  ditolak (422), bukan diabaikan.
                </li>
                <li>
                  Bila <code className="font-mono">crisis.detected</code> bernilai true, aplikasimu{' '}
                  <strong>wajib</strong> menampilkan{' '}
                  <code className="font-mono">crisis.resource</code> kepada pengguna.
                </li>
                <li>
                  Hasil skrining adalah skrining, bukan diagnosis. Tampilkan{' '}
                  <code className="font-mono">disclaimer</code> bersama hasilnya.
                </li>
                <li>
                  FHIR hanya memuat skor total dan interpretasi, tidak pernah jawaban per butir.
                  PHQ-9 dan GAD-7 memakai kode LOINC; PSS-10 dan SRQ-20 memakai sistem kode lokal
                  Mindra.
                </li>
                <li>
                  Agregat mitra memakai anonimitas k ≥ 10: grup kecil disembunyikan seluruhnya, dan
                  tidak pernah ada data individu.
                </li>
                <li>
                  SATUSEHAT: bidang <code className="font-mono">mode</code> pada respons menyebut
                  mode yang dipakai. Mode <code className="font-mono">mock</code> adalah simulasi
                  lokal; tidak ada data yang keluar dari server Mindra.
                </li>
              </ul>
            </Alert>
          </section>

          {groups.map((group) => (
            <section
              key={group.tag}
              aria-labelledby={`tag-${group.tag.replace(/\s+/g, '-')}`}
              className="grid grid-cols-1 gap-5"
            >
              <div>
                <h2 id={`tag-${group.tag.replace(/\s+/g, '-')}`} className="h2">
                  {group.tag}
                </h2>
                {group.description ? <p className="mt-1 body-m">{group.description}</p> : null}
              </div>
              {group.operations.map((item) => {
                const config = configOf.get(item.operation.operationId);
                return config ? (
                  <EndpointSection
                    key={item.operation.operationId}
                    item={item}
                    config={config}
                    baseUrl={baseUrl}
                  />
                ) : null;
              })}
            </section>
          ))}
        </div>
      </div>
    </Container>
  );
}

function EndpointList({ groups }: { groups: ReturnType<typeof groupOperations> }) {
  return (
    <nav aria-label="Lompat ke endpoint" className="mt-2 wide:mt-0">
      <ul className="grid gap-3.5">
        {groups.map((group) => (
          <li key={group.tag}>
            <p className="mb-1 text-xs font-semibold text-fg-4">{group.tag}</p>
            <ul className="grid gap-0.5">
              {group.operations.map((item) => (
                <li key={item.operation.operationId}>
                  <a
                    href={`#${ANCHOR(item.operation.operationId)}`}
                    className="block rounded-sm py-1 text-sm text-fg-2 no-underline hover:text-biru-600"
                  >
                    <span className="mr-1.5 font-mono text-xs font-bold text-fg-3">
                      {item.method}
                    </span>
                    {item.path.replace('/api/v1', '')}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
