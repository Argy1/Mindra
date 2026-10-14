import { describe, expect, it } from 'vitest';
import {
  ACCESS_LOG_CSV_HEADER,
  accessLogToCsv,
  csvCell,
  describeAction,
  groupAccessLogByDay,
  type AccessLogEntry,
} from './access-log';
import {
  CAREGIVER_PERMISSION_KEYS,
  DEFAULT_CAREGIVER_PERMISSIONS,
  DEFAULT_PSYCHOLOGIST_PERMISSIONS,
  PERMISSION_LABEL,
  PSYCHOLOGIST_PERMISSION_KEYS,
  readPermissions,
  setPermissionSchema,
} from './permissions';

const ID = '8f5e0d86-1b2c-4a53-9c1e-6a1b5a0f3c7d';

describe('readPermissions (meniru SQL: hanya true yang berarti diizinkan)', () => {
  it('membaca boolean true dan teks "true", selain itu tidak diizinkan', () => {
    expect(
      readPermissions('psychologist', {
        assessments: true,
        mood: 'true',
        sleep: 'TRUE',
        crisis_alerts: 1,
        ai_summary: null,
      }),
    ).toEqual({
      assessments: true,
      mood: true,
      sleep: false,
      crisis_alerts: false,
      ai_summary: false,
    });
  });

  it('kunci hilang = tidak diizinkan; kunci asing diabaikan', () => {
    expect(readPermissions('caregiver', { mood_daily: true, admin: true })).toEqual({
      mood_daily: true,
      assessment_results: false,
      app_activity: false,
      emergency_alerts: false,
    });
  });

  it.each([null, undefined, 'x', 3, [], [true]])('masukan bukan objek (%j) → semua mati', (raw) => {
    expect(Object.values(readPermissions('psychologist', raw)).every((v) => v === false)).toBe(
      true,
    );
  });

  it('nilai bawaan sesuai desain dan aplikasi Flutter', () => {
    expect(DEFAULT_PSYCHOLOGIST_PERMISSIONS).toEqual({
      assessments: true,
      mood: true,
      sleep: true,
      crisis_alerts: true,
      ai_summary: false,
    });
    expect(DEFAULT_CAREGIVER_PERMISSIONS).toEqual({
      mood_daily: true,
      assessment_results: false,
      app_activity: false,
      emergency_alerts: true,
    });
  });

  it('setiap kunci punya label tanpa tanda seru', () => {
    for (const key of [...PSYCHOLOGIST_PERMISSION_KEYS, ...CAREGIVER_PERMISSION_KEYS]) {
      expect(PERMISSION_LABEL[key]).toBeTruthy();
      expect(PERMISSION_LABEL[key]).not.toContain('!');
    }
  });
});

describe('setPermissionSchema (permintaan mengubah satu izin)', () => {
  it('menerima kunci yang cocok dengan jenisnya', () => {
    expect(
      setPermissionSchema.safeParse({ kind: 'psychologist', id: ID, key: 'mood', enabled: false })
        .success,
    ).toBe(true);
    expect(
      setPermissionSchema.safeParse({ kind: 'caregiver', id: ID, key: 'mood_daily', enabled: true })
        .success,
    ).toBe(true);
  });

  it.each([
    { kind: 'psychologist', id: ID, key: 'mood_daily', enabled: true }, // kunci pendamping untuk psikolog
    { kind: 'caregiver', id: ID, key: 'sleep', enabled: true }, // kunci psikolog untuk pendamping
    { kind: 'admin', id: ID, key: 'mood', enabled: true },
    { kind: 'psychologist', id: 'bukan-uuid', key: 'mood', enabled: true },
    { kind: 'psychologist', id: ID, key: 'mood', enabled: 'true' },
    { kind: 'psychologist', id: ID, key: 'mood', enabled: 1 },
    { kind: 'psychologist', id: ID, key: 'role', enabled: true },
    { kind: 'psychologist', id: ID, key: 'mood', enabled: true, status: 'revoked' },
    { kind: 'psychologist', id: ID, key: 'mood' },
    {},
    null,
  ])('menolak: %j', (input) => {
    expect(setPermissionSchema.safeParse(input).success).toBe(false);
  });
});

const entry = (overrides: Partial<AccessLogEntry> = {}): AccessLogEntry => ({
  id: 1,
  actorName: 'Rina Sari, M.Psi.',
  actorRole: 'psychologist',
  resource: 'assessments',
  action: 'read',
  createdAt: '2026-10-13T09:12:00+07:00',
  ...overrides,
});

describe('describeAction', () => {
  it('menyusun kalimat dari jenis data dan aksi', () => {
    expect(describeAction('assessments', 'read')).toBe('membuka hasil skrining');
    expect(describeAction('sleep', 'read')).toBe('membuka catatan tidur');
    expect(describeAction('mood', 'export')).toBe('mengunduh mood harian');
    expect(describeAction('crisis_alerts', 'acknowledge')).toBe(
      'menandai peringatan krisis sudah ditangani',
    );
  });
  it('jenis data tak dikenal tidak membocorkan nilai mentah', () => {
    expect(describeAction('tabel_rahasia', 'read')).toBe('membuka datamu');
  });
});

describe('groupAccessLogByDay', () => {
  const now = new Date('2026-10-13T20:00:00+07:00');

  it('mengelompokkan per hari WIB: Hari ini, Kemarin, lalu tanggal; terbaru dulu', () => {
    const groups = groupAccessLogByDay(
      [
        entry({ id: 1, createdAt: '2026-10-13T09:12:00+07:00' }),
        entry({ id: 2, createdAt: '2026-10-13T09:10:00+07:00' }),
        entry({ id: 3, createdAt: '2026-10-12T20:40:00+07:00' }),
        entry({ id: 4, createdAt: '2026-10-09T08:00:00+07:00' }),
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(['Hari ini', 'Kemarin', 'Jumat, 9 Oktober']);
    expect(groups[0]!.entries.map((e) => e.id)).toEqual([1, 2]);
  });

  it('memakai hari WIB, bukan UTC (23.30 WIB = 16.30 UTC)', () => {
    const groups = groupAccessLogByDay([entry({ createdAt: '2026-10-12T17:30:00Z' })], now);
    // 17.30 UTC tanggal 12 = 00.30 WIB tanggal 13 = hari ini.
    expect(groups[0]!.label).toBe('Hari ini');
  });

  it('kosong → tanpa kelompok', () => {
    expect(groupAccessLogByDay([], now)).toEqual([]);
  });
});

describe('CSV riwayat akses', () => {
  it('csvCell menetralkan injeksi rumus dan mengutip karakter khusus', () => {
    expect(csvCell('=HYPERLINK("http://x","klik")')).toBe(`"'=HYPERLINK(""http://x"",""klik"")"`);
    for (const prefix of ['=', '+', '-', '@']) {
      expect(csvCell(`${prefix}cmd`)).toBe(`'${prefix}cmd`);
    }
    expect(csvCell('\t=1+1')).toBe(`'\t=1+1`);
    expect(csvCell('Rina, M.Psi.')).toBe('"Rina, M.Psi."');
    expect(csvCell('baris\nbaru')).toBe('"baris\nbaru"');
    expect(csvCell('Biasa saja')).toBe('Biasa saja');
  });

  it('menghasilkan BOM, header, dan satu baris per entri dengan waktu WIB', () => {
    const csv = accessLogToCsv([entry(), entry({ id: 2, resource: 'mood', action: 'export' })]);
    expect(csv.startsWith('﻿')).toBe(true);
    // Jangan trim(): trim JavaScript ikut membuang karakter BOM.
    const lines = csv.replace(/\r\n$/, '').split('\r\n');
    expect(lines[0]).toBe(`﻿${ACCESS_LOG_CSV_HEADER.join(',')}`);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-10-13 09:12:00,"Rina Sari, M.Psi.",Psikolog,hasil skrining,read');
    expect(lines[2]).toContain('mood harian,export');
  });

  it('SERANGAN: nama pelaku berisi rumus tidak menjadi rumus di spreadsheet', () => {
    const csv = accessLogToCsv([entry({ actorName: "=cmd|' /C calc'!A0" })]);
    const row = csv.trim().split('\r\n')[1]!;
    expect(row.split(',')[1]!.startsWith(`'=`) || row.includes(`"'=`)).toBe(true);
    expect(row).not.toMatch(/(^|,)=/);
  });
});
