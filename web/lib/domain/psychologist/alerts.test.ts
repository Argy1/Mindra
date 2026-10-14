import { describe, expect, it } from 'vitest';
import {
  describeAlertReason,
  formatAlertTime,
  isAlertSeverity,
  pendingAlertFromRow,
  parseRealtimePayload,
  realtimeAlertSchema,
  relativeTimeId,
  sourceLabel,
} from './alerts';

describe('describeAlertReason', () => {
  it('kritis dengan skrining dibagikan: nama instrumen, skor, dan alasan', () => {
    expect(
      describeAlertReason('critical', {
        source: 'assessment',
        assessment: { type: 'phq9', score: 17 },
      }),
    ).toBe(
      'PHQ-9 skor 17. Menjawab positif pada pertanyaan tentang pikiran lebih baik mati atau menyakiti diri.',
    );
  });

  it('klien tidak membagikan skrining: tanpa skor, alasan tetap ada', () => {
    expect(describeAlertReason('high', { source: 'assessment', assessment: null })).toBe(
      'Hasil skrining masuk kategori berat.',
    );
  });

  it('instrumen tak dikenal tidak menampilkan nilai mentah', () => {
    expect(
      describeAlertReason('high', {
        source: 'assessment',
        assessment: { type: 'dass21', score: 40 },
      }),
    ).toBe('Hasil skrining masuk kategori berat.');
  });

  it('tidak pernah menampilkan jawaban per butir', () => {
    const text = describeAlertReason('critical', {
      source: 'assessment',
      assessment: { type: 'srq20', score: 9 },
    });
    expect(text).not.toMatch(/phq9_9|srq20_17|jawaban \d/i);
  });
});

describe('sumber dan tingkat', () => {
  it('label sumber dikenal dan cadangan untuk yang asing', () => {
    expect(sourceLabel('assessment')).toBe('Diisi lewat skrining Mindra');
    expect(sourceLabel('ai_chat')).toContain('teman cerita');
    expect(sourceLabel('apa-ini')).toBe('Sumber tidak diketahui');
  });

  it('hanya high dan critical yang valid', () => {
    expect(isAlertSeverity('critical')).toBe(true);
    expect(isAlertSeverity('high')).toBe(true);
    for (const bad of ['low', 'CRITICAL', '', null, undefined, 3])
      expect(isAlertSeverity(bad)).toBe(false);
  });
});

describe('relativeTimeId', () => {
  const now = new Date('2026-10-13T10:00:00+07:00');
  it.each([
    ['2026-10-13T09:59:30+07:00', 'baru saja'],
    ['2026-10-13T09:58:00+07:00', '2 menit lalu'],
    ['2026-10-13T07:00:00+07:00', '3 jam lalu'],
    ['2026-10-11T10:00:00+07:00', '11 Oktober'],
  ])('%s → %s', (iso, expected) => {
    expect(relativeTimeId(iso, now)).toBe(expected);
  });

  it('waktu di masa depan (selisih jam perangkat) dianggap baru saja', () => {
    expect(relativeTimeId('2026-10-13T10:05:00+07:00', now)).toBe('baru saja');
  });
});

describe('pendingAlertFromRow', () => {
  const names = new Map([['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Dimas Pratama']]);
  const row = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    severity: 'critical',
    status: 'open',
    source: 'assessment',
    created_at: '2026-10-13T00:48:00Z',
  };

  it('peringatan terbuka klien yang dikenal menjadi kartu sementara', () => {
    expect(pendingAlertFromRow(row, names)).toMatchObject({
      id: row.id,
      patientName: 'Dimas Pratama',
      severity: 'critical',
      pending: true,
    });
  });

  it.each([
    ['sudah ditangani', { status: 'resolved' }],
    ['tingkat rendah', { severity: 'low' }],
    ['klien tidak dikenal', { user_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }],
  ])('tidak menampilkan peringatan %s', (_name, patch) => {
    expect(pendingAlertFromRow({ ...row, ...patch }, names)).toBeNull();
  });

  it('sumber kosong dianggap skrining', () => {
    expect(pendingAlertFromRow({ ...row, source: null }, names)?.source).toBe('assessment');
  });
});

describe('realtimeAlertSchema', () => {
  it('menolak payload yang bentuknya salah, tanpa melempar', () => {
    for (const bad of [null, {}, { id: 'x' }, { id: 1, user_id: 2 }, 'teks']) {
      expect(realtimeAlertSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('parseRealtimePayload', () => {
  const row = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    severity: 'critical',
    status: 'open',
    created_at: '2026-10-13T00:48:00Z',
  };

  it('payload utuh dibaca menjadi jenis kejadian dan baris', () => {
    expect(parseRealtimePayload({ eventType: 'INSERT', new: row })).toEqual({
      eventType: 'INSERT',
      row,
    });
  });

  it.each([null, undefined, 'teks', 42, {}, { eventType: 'DELETE', new: {} }, { new: row }])(
    'bentuk tak dikenal (%j) menghasilkan null, bukan galat',
    (payload) => {
      expect(parseRealtimePayload(payload)).toBeNull();
    },
  );
});

describe('formatAlertTime', () => {
  it('hari ini hanya jam, hari lain memakai tanggal', () => {
    expect(formatAlertTime('2026-10-13T00:48:00Z', '2026-10-13')).toBe('07.48 WIB');
    expect(formatAlertTime('2026-10-11T00:48:00Z', '2026-10-13')).toBe('11 Okt, 07.48 WIB');
  });
});
