import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LEGAL_UPDATED_AT, LEGAL_VERSION } from './version';

/**
 * Naskah hukum Mindra satu untuk web DAN aplikasi mobile. Tes ini menjaga agar versi, tanggal, dan rujukan
 * regulasinya sama di semua tempat (konstanta web, konstanta Flutter, dan dua dokumen di folder induk), karena
 * versi yang disetujui pengguna tersimpan di metadata akunnya.
 */
const read = (path: string): string | null => {
  const file = fileURLToPath(new URL(path, import.meta.url));
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
};

const privacy = read('../../../docs/privacy_policy.md');
const terms = read('../../../docs/terms_of_service.md');
const dartConstants = read('../../../lib/core/constants/legal.dart');
const privacyPage = read('../../app/(marketing)/kebijakan-privasi/page.tsx');

describe('versi naskah hukum', () => {
  it('berbentuk x.y.z dan tanggalnya terbaca', () => {
    expect(LEGAL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(LEGAL_UPDATED_AT).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
  });

  it.skipIf(!dartConstants)('konstanta Flutter sama dengan konstanta web', () => {
    expect(dartConstants).toContain(`const String kLegalVersion = '${LEGAL_VERSION}';`);
  });

  describe.skipIf(!privacy || !terms)('dokumen di folder induk', () => {
    it.each([
      ['kebijakan privasi', privacy ?? ''],
      ['ketentuan layanan', terms ?? ''],
    ])('%s memuat versi dan tanggal berlaku yang sama', (_name, text) => {
      expect(text).toContain(`**Berlaku efektif:** ${LEGAL_UPDATED_AT}`);
      expect(text).toContain(`**Versi:** ${LEGAL_VERSION}`);
    });
  });
});

describe('rujukan peraturan pelindungan data pribadi', () => {
  // PP No. 33 Tahun 2026: peraturan pelaksanaan UU No. 27 Tahun 2022, ditetapkan 16 Juli 2026, berlaku 16 Januari 2027.
  it.skipIf(!privacy)(
    'dokumen kebijakan privasi menyebut UU 27/2022 dan PP 33/2026 beserta tanggal berlakunya',
    () => {
      expect(privacy).toContain('Undang-Undang No. 27 Tahun 2022');
      expect(privacy).toContain('Peraturan Pemerintah No. 33 Tahun 2026');
      expect(privacy).toContain('berlaku mulai 16 Januari 2027');
    },
  );

  it.skipIf(!privacyPage)(
    'halaman web kebijakan privasi menyebut PP 33/2026 beserta tanggal berlakunya',
    () => {
      const text = (privacyPage ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi');
      expect(text).toContain('PP No. 33 Tahun 2026 (berlaku mulai 16 Januari 2027)');
    },
  );
});
