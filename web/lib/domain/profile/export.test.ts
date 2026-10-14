import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildExport,
  EXPORT_ROW_LIMIT,
  EXPORT_SECTIONS,
  exportFileName,
  sanitizeRows,
  type SectionResult,
} from './export';

const USER = '00000000-0000-4000-8000-0000000000a1';
const ALL_OK: Record<string, SectionResult> = Object.fromEntries(
  EXPORT_SECTIONS.map((section) => [section.key, { rows: [{ id: section.key }] }]),
);

describe('EXPORT_SECTIONS terhadap tipe database', () => {
  const types = readFileSync(path.resolve('lib/supabase/database.types.ts'), 'utf8');
  const columnsOf = (table: string): string[] => {
    const match = new RegExp(
      `\\n      ${table}: \\{\\n        Row: \\{([\\s\\S]*?)\\n        \\}`,
    ).exec(types);
    return match ? [...match[1]!.matchAll(/\n {10}(\w+)\??:/g)].map((m) => m[1]!) : [];
  };

  it.each(EXPORT_SECTIONS.map((s) => [s.key, s] as const))(
    '%s: tabel, kolom pemilik, kolom urut, dan kolom yang dibuang benar-benar ada',
    (_key, section) => {
      const columns = columnsOf(section.table);
      expect(columns.length, `tabel ${section.table}`).toBeGreaterThan(0);
      expect(columns, 'kolom pemilik').toContain(section.ownerColumn);
      if (section.orderBy) expect(columns, 'kolom urut').toContain(section.orderBy);
      for (const dropped of section.drop)
        expect(columns, `kolom buangan ${dropped}`).toContain(dropped);
    },
  );

  it('daftar bagian yang diekspor tepat 17 (kontrak dengan kebijakan privasi), tanpa yang hilang diam-diam', () => {
    expect(EXPORT_SECTIONS.map((s) => s.key)).toEqual([
      'profil',
      'skrining',
      'mood',
      'tidur',
      'teman_cerita',
      'konsultasi',
      'izin_psikolog',
      'izin_pendamping',
      'kontak_darurat',
      'refleksi_malam',
      'catatan_pikiran',
      'latihan',
      'jurnal_suara',
      'peringatan_krisis',
      'sinkron_satusehat',
      'aktivitas',
      'notifikasi',
    ]);
  });

  it('kunci bagian unik; kolom rahasia memang ada di daftar buangan', () => {
    expect(new Set(EXPORT_SECTIONS.map((s) => s.key)).size).toBe(EXPORT_SECTIONS.length);
    const drop = (table: string) => EXPORT_SECTIONS.find((s) => s.table === table)?.drop ?? [];
    expect(drop('profiles')).toContain('nik_encrypted');
    expect(drop('consultations')).toEqual(
      expect.arrayContaining(['agora_token', 'agora_channel_name']),
    );
    expect(drop('caregiver_relationships')).toContain('invite_code');
  });
});

describe('sanitizeRows', () => {
  it('membuang kolom terlarang dari setiap baris, kolom lain utuh, masukan tidak diubah', () => {
    const input = [
      { id: 1, agora_token: 'rahasia', note: 'a' },
      { id: 2, agora_token: 'x' },
    ];
    const out = sanitizeRows({ drop: ['agora_token'] }, input);
    expect(out).toEqual([{ id: 1, note: 'a' }, { id: 2 }]);
    expect(input[0]).toHaveProperty('agora_token');
  });

  it('tanpa kolom buangan: salinan baris (bukan objek yang sama)', () => {
    const input = [{ id: 1 }];
    const out = sanitizeRows({ drop: [] }, input);
    expect(out).toEqual(input);
    expect(out[0]).not.toBe(input[0]);
  });
});

describe('buildExport', () => {
  const generatedAt = new Date('2026-10-14T10:00:00Z');

  it('memuat semua bagian, riwayat akses, id akun, dan waktu; tidak ada yang dilewati atau terpotong', () => {
    const doc = buildExport({
      userId: USER,
      generatedAt,
      sections: ALL_OK,
      accessLog: { rows: [{ id: 9 }] },
    });
    expect(doc.id_akun).toBe(USER);
    expect(doc.dibuat_pada).toBe('2026-10-14T10:00:00.000Z');
    expect(Object.keys(doc.data)).toEqual([...EXPORT_SECTIONS.map((s) => s.key), 'riwayat_akses']);
    expect(doc.bagian_dilewati).toEqual([]);
    expect(doc.bagian_terpotong).toEqual([]);
    expect(doc._tentang).toContain('jurnal suara');
  });

  it('bagian yang gagal dibaca atau hilang DISEBUT dilewati, bukan hilang diam-diam', () => {
    const sections = { ...ALL_OK, mood: { rows: [], error: true } };
    delete (sections as Record<string, unknown>).tidur;
    const doc = buildExport({
      userId: USER,
      generatedAt,
      sections,
      accessLog: { rows: [], error: true },
    });
    expect(doc.bagian_dilewati.sort()).toEqual(['mood', 'riwayat_akses', 'tidur']);
    expect(doc.data).not.toHaveProperty('mood');
    expect(doc.data).not.toHaveProperty('tidur');
    expect(doc.data).not.toHaveProperty('riwayat_akses');
  });

  it('batas baris persis 5000: 4999 baris utuh, 5000 baris ditandai terpotong', () => {
    expect(EXPORT_ROW_LIMIT).toBe(5000);
    const make = (count: number) =>
      buildExport({
        userId: USER,
        generatedAt,
        sections: {
          ...ALL_OK,
          mood: { rows: Array.from({ length: count }, (_, i) => ({ id: i })) },
        },
        accessLog: { rows: [] },
      });
    expect(make(4999).bagian_terpotong).toEqual([]);
    expect(make(5000).bagian_terpotong).toEqual(['mood']);
  });

  it('bagian yang mencapai batas baris ditandai terpotong', () => {
    const rows = Array.from({ length: EXPORT_ROW_LIMIT }, (_, i) => ({ id: i }));
    const doc = buildExport({
      userId: USER,
      generatedAt,
      sections: { ...ALL_OK, mood: { rows } },
      accessLog: { rows: [] },
    });
    expect(doc.bagian_terpotong).toEqual(['mood']);
    expect(doc.data.mood).toHaveLength(EXPORT_ROW_LIMIT);
  });

  it('kolom rahasia tidak pernah sampai ke dokumen akhir', () => {
    const doc = buildExport({
      userId: USER,
      generatedAt,
      sections: {
        ...ALL_OK,
        profil: { rows: [{ id: USER, name: 'A', nik_encrypted: 'XYZ' }] },
        konsultasi: {
          rows: [{ id: 'c', agora_token: 'T', agora_channel_name: 'C', status: 'confirmed' }],
        },
        izin_pendamping: { rows: [{ id: 'r', invite_code: 'KODE1234', status: 'pending' }] },
      },
      accessLog: { rows: [] },
    });
    const text = JSON.stringify(doc);
    for (const secret of [
      'XYZ',
      'agora_token',
      'agora_channel_name',
      'KODE1234',
      'nik_encrypted',
    ]) {
      expect(text, secret).not.toContain(secret);
    }
    expect(doc.data.konsultasi?.[0]).toEqual({ id: 'c', status: 'confirmed' });
  });
});

describe('exportFileName', () => {
  it('memakai tanggal WIB, bukan UTC', () => {
    // 17.30 UTC tanggal 14 = 00.30 WIB tanggal 15.
    expect(exportFileName(new Date('2026-10-14T17:30:00Z'))).toBe('data-mindra-2026-10-15.json');
    expect(exportFileName(new Date('2026-10-14T16:59:00Z'))).toBe('data-mindra-2026-10-14.json');
  });

  it('hanya karakter aman untuk nama berkas', () => {
    expect(exportFileName(new Date())).toMatch(/^data-mindra-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
