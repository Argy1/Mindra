import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TITLE,
  FEE_MAX,
  PRACTICE_DAYS,
  parseSpecializations,
  reviewErrorMessage,
  reviewFieldsFromForm,
  reviewSchema,
} from './review';

const PROFILE = '11111111-1111-4111-8111-111111111111';

const approve = (overrides: Record<string, unknown> = {}) => ({
  decision: 'approve',
  profileId: PROFILE,
  fullName: 'Dr. Sinta Wulandari',
  title: '',
  strNumber: 'STR-12345',
  specializations: 'Kecemasan, Tidur',
  fee: '150000',
  verified: 'on',
  days: ['1', '3', '5'],
  start: '09:00',
  end: '15:00',
  ...overrides,
});

const errorsOf = (raw: unknown): Record<string, string> => {
  const result = reviewSchema.safeParse(raw);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0] ?? '_form'), issue.message]),
  );
};

describe('reviewSchema: persetujuan', () => {
  it('masukan sah: nilai dinormalkan (gelar bawaan, spesialisasi berupa daftar, hari urut dan unik, angka)', () => {
    const parsed = reviewSchema.parse(approve({ days: ['5', '1', '1', '0'] }));
    expect(parsed).toEqual({
      decision: 'approve',
      profileId: PROFILE,
      fullName: 'Dr. Sinta Wulandari',
      title: DEFAULT_TITLE,
      strNumber: 'STR-12345',
      specializations: ['Kecemasan', 'Tidur'],
      fee: 150000,
      verified: true,
      days: [0, 1, 5],
      start: '09:00',
      end: '15:00',
    });
  });

  it('spasi berlebih dirapikan, dan kotak "terverifikasi" tanpa centang = false', () => {
    const parsed = reviewSchema.parse(
      approve({ fullName: '  Dr.   Sinta  ', verified: undefined, title: ' M.Psi.  Klinis ' }),
    );
    expect(parsed).toMatchObject({
      fullName: 'Dr. Sinta',
      verified: false,
      title: 'M.Psi. Klinis',
    });
  });

  it.each([
    ['nama kosong', { fullName: ' ' }, 'fullName'],
    ['nama satu huruf', { fullName: 'A' }, 'fullName'],
    ['nama terlalu panjang', { fullName: 'x'.repeat(121) }, 'fullName'],
    ['STR kosong', { strNumber: '  ' }, 'strNumber'],
    ['STR terlalu panjang', { strNumber: 'x'.repeat(61) }, 'strNumber'],
    ['tarif bukan angka', { fee: '150rb' }, 'fee'],
    ['tarif negatif', { fee: '-5' }, 'fee'],
    ['tarif desimal', { fee: '1500.5' }, 'fee'],
    ['tarif terlalu besar', { fee: String(FEE_MAX + 1) }, 'fee'],
    [
      'spesialisasi terlalu banyak',
      { specializations: Array.from({ length: 11 }, (_, i) => `S${i}`).join(',') },
      'specializations',
    ],
    ['spesialisasi terlalu panjang', { specializations: 'x'.repeat(61) }, 'specializations'],
    ['hari di luar 0-6', { days: ['7'] }, 'days'],
    ['hari bukan angka', { days: ['senin'] }, 'days'],
    ['hari tanpa jam mulai', { start: '' }, 'start'],
    ['jam mulai tidak valid', { start: '25:00' }, 'start'],
    ['jam mulai 24:00 (hari berikutnya)', { start: '24:00', end: '24:30' }, 'start'],
    ['jam selesai 24:00 (hari berikutnya)', { end: '24:00' }, 'end'],
    ['jam dengan menit di luar 00-59', { start: '09:60' }, 'start'],
    ['jam selesai tidak valid', { end: '9' }, 'end'],
    ['jam selesai sebelum mulai', { start: '15:00', end: '09:00' }, 'end'],
    ['jam selesai sama dengan mulai', { start: '09:00', end: '09:00' }, 'end'],
  ])('menolak %s dengan pesan di kolomnya', (_name, overrides, field) => {
    expect(errorsOf(approve(overrides))[field]).toBeTruthy();
  });

  it('tarif: batas atas persis Rp 5.000.000, dan lebih dari 7 digit ditolak dengan pesan bentuk angka', () => {
    expect(FEE_MAX).toBe(5_000_000);
    expect(reviewSchema.parse(approve({ fee: '5000000' }))).toMatchObject({ fee: 5_000_000 });
    expect(errorsOf(approve({ fee: '5000001' })).fee).toContain('maksimal');
    expect(errorsOf(approve({ fee: '12345678' })).fee).toContain('bilangan bulat');
    expect(errorsOf(approve({ fee: '123456789' })).fee).toContain('bilangan bulat');
  });

  it('kotak "terverifikasi": hanya nilai "on" yang berarti ya; nilai lain apa pun berarti tidak', () => {
    expect(reviewSchema.parse(approve({ verified: 'on' }))).toMatchObject({ verified: true });
    for (const verified of [undefined, '', 'true', '1', 'ON', 'off']) {
      expect(reviewSchema.parse(approve({ verified })), String(verified)).toMatchObject({
        verified: false,
      });
    }
  });

  it('tarif Rp 0 sah (gratis); tarif batas atas sah', () => {
    expect(reviewSchema.parse(approve({ fee: '0' }))).toMatchObject({ fee: 0 });
    expect(reviewSchema.parse(approve({ fee: String(FEE_MAX) }))).toMatchObject({ fee: FEE_MAX });
  });

  it('tanpa hari praktik, jam tidak diperiksa (psikolog tampil di direktori tanpa slot)', () => {
    const parsed = reviewSchema.parse(approve({ days: [], start: '', end: '' }));
    expect(parsed).toMatchObject({ days: [], start: '', end: '' });
  });

  it('id bukan UUID ditolak', () => {
    expect(errorsOf(approve({ profileId: 'abc' })).profileId).toBeTruthy();
  });
});

describe('reviewSchema: penolakan dan keputusan lain', () => {
  it('penolakan hanya butuh id; kolom persetujuan (termasuk yang jahat) dibuang', () => {
    const parsed = reviewSchema.parse({
      decision: 'reject',
      profileId: PROFILE,
      role: 'admin',
      fee: '1',
    });
    expect(parsed).toEqual({ decision: 'reject', profileId: PROFILE });
  });

  it.each(['maybe', '', undefined, 'APPROVE'])('keputusan %j ditolak', (decision) => {
    expect(reviewSchema.safeParse({ decision, profileId: PROFILE }).success).toBe(false);
  });
});

describe('parseSpecializations', () => {
  it('memisahkan koma, merapikan spasi, membuang kosong dan ganda (tanpa membedakan huruf)', () => {
    expect(parseSpecializations(' Kecemasan ,, tidur ,  KECEMASAN,  Stres   kerja ')).toEqual([
      'Kecemasan',
      'tidur',
      'Stres kerja',
    ]);
    expect(parseSpecializations('')).toEqual([]);
  });
});

describe('reviewFieldsFromForm', () => {
  it('membaca kolom yang dikenal dan banyak hari; kolom asing dan berkas diabaikan', () => {
    const form = new FormData();
    form.append('decision', 'approve');
    form.append('profileId', PROFILE);
    form.append('days', '1');
    form.append('days', '2');
    form.append('role', 'admin');
    form.append('fullName', new File(['x'], 'x.txt'));
    const raw = reviewFieldsFromForm(form);
    expect(raw).toMatchObject({
      decision: 'approve',
      profileId: PROFILE,
      days: ['1', '2'],
      fullName: '',
    });
    expect(raw).not.toHaveProperty('role');
  });
});

describe('reviewErrorMessage', () => {
  it('memetakan token database ke kalimat, 42501 ke pesan sesi, dan yang tak dikenal ke null', () => {
    expect(reviewErrorMessage('not_pending')).toContain('sudah diputuskan');
    expect(reviewErrorMessage('invalid_schedule')).toContain('Jadwal');
    expect(reviewErrorMessage('apa saja', '42501')).toContain('verifikasi dua langkah');
    expect(reviewErrorMessage('galat tak dikenal')).toBeNull();
    expect(reviewErrorMessage(undefined)).toBeNull();
  });
});

describe('PRACTICE_DAYS', () => {
  it('tujuh hari, Senin dulu, nilai 0-6 tanpa ganda (0 = Minggu, sama dengan kolom database)', () => {
    expect(PRACTICE_DAYS.map((d) => d.value)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(PRACTICE_DAYS[0]?.label).toBe('Senin');
    expect(PRACTICE_DAYS[6]).toEqual({ value: 0, label: 'Minggu' });
  });
});
