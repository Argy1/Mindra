import { describe, expect, it } from 'vitest';
import {
  firstErrors,
  forgotPasswordSchema,
  loginSchema,
  pickFields,
  registerSchema,
  resetPasswordSchema,
} from './auth';

const validRegister = {
  name: 'Rina Sari',
  email: 'rina@email.com',
  password: 'kata-sandi-aman',
  accountType: 'self',
  ageConfirmed: 'on',
  consent: 'on',
};

function errorsOf(result: { success: boolean; error?: { issues: unknown[] } }) {
  if (result.success) return {};
  return firstErrors(result.error as never);
}

describe('loginSchema', () => {
  it('menormalkan email: dipangkas dan huruf kecil', () => {
    const parsed = loginSchema.parse({ email: '  Rina@Email.COM ', password: 'x' });
    expect(parsed.email).toBe('rina@email.com');
  });

  it('kolom kosong → pesan per kolom', () => {
    const errors = errorsOf(loginSchema.safeParse({ email: '', password: '' }));
    expect(errors).toEqual({ email: 'Isi alamat emailmu.', password: 'Isi kata sandimu.' });
  });

  it('tidak mengulang aturan panjang sandi (tidak membocorkan kebijakan lewat pesan galat login)', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'pendek' }).success).toBe(true);
  });

  it('email tidak valid → pesan yang menjelaskan cara memperbaiki', () => {
    const errors = errorsOf(loginSchema.safeParse({ email: 'bukan-email', password: 'x' }));
    expect(errors.email).toMatch(/Contoh: nama@email\.com/);
  });

  it('nilai yang hilang (null dari FormData) tidak melempar, melainkan jadi pesan', () => {
    const errors = errorsOf(loginSchema.safeParse({ email: undefined, password: undefined }));
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('kata sandi > 72 karakter ditolak (bcrypt memotong diam-diam)', () => {
    expect(
      errorsOf(loginSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(73) })).password,
    ).toMatch(/terlalu panjang/);
  });
});

describe('registerSchema', () => {
  it('data valid lolos, accountType bawaan "self"', () => {
    const { accountType: _omit, ...rest } = validRegister;
    const parsed = registerSchema.parse(rest);
    expect(parsed.accountType).toBe('self');
  });

  it('"Saya psikolog" diterima sebagai permintaan bila nomor STR diisi', () => {
    const parsed = registerSchema.parse({
      ...validRegister,
      accountType: 'psychologist',
      strNumber: 'STR-1234',
    });
    expect(parsed.accountType).toBe('psychologist');
    expect(parsed.strNumber).toBe('STR-1234');
  });

  describe('nomor STR calon psikolog', () => {
    const psychologist = { ...validRegister, accountType: 'psychologist' };
    const strError = (strNumber: unknown) =>
      errorsOf(registerSchema.safeParse({ ...psychologist, strNumber })).strNumber;

    it('wajib untuk psikolog: kosong, spasi saja, atau tidak dikirim ditolak dengan alasan yang jelas', () => {
      const required = /Isi nomor STR-mu/;
      expect(strError('')).toMatch(required);
      expect(strError('     ')).toMatch(required);
      expect(strError(undefined)).toMatch(required);
    });

    it('pangkas dan rapikan spasi; panjang 5 sampai 60 karakter', () => {
      expect(
        registerSchema.parse({ ...psychologist, strNumber: '  STR   12345  678 ' }).strNumber,
      ).toBe('STR 12345 678');
      expect(strError('1234')).toMatch(/terlalu pendek/);
      expect(strError('12345')).toBeUndefined();
      expect(strError('1'.repeat(60))).toBeUndefined();
      expect(strError('1'.repeat(61))).toMatch(/maksimal 60 karakter/);
    });

    it('hanya huruf, angka, spasi, titik, garis miring, dan tanda hubung', () => {
      for (const ok of ['STR-1234/5678', 'No. 12.345.678', 'str 123456', 'ABC.123-45/6']) {
        expect(strError(ok), ok).toBeUndefined();
      }
      for (const bad of ['<script>1', "1234'; drop", 'STR#12345', '-12345', '12345;67']) {
        expect(strError(bad), bad).toMatch(/hanya boleh berisi/);
      }
    });

    it('pendaftar biasa tidak diminta STR, dan STR yang ikut terkirim dibuang (tidak sampai ke metadata)', () => {
      const plain = registerSchema.parse({ ...validRegister, strNumber: 'STR-DISELIPKAN' });
      expect(plain.strNumber).toBeUndefined();
      expect(registerSchema.safeParse({ ...validRegister }).success).toBe(true);
      expect(registerSchema.parse({ ...validRegister, strNumber: '' }).strNumber).toBeUndefined();
    });
  });

  it('SERANGAN: accountType="admin" ditolak (peran tidak bisa dipilih lewat formulir)', () => {
    for (const accountType of ['admin', 'facility_admin', 'caregiver', 'user']) {
      expect(registerSchema.safeParse({ ...validRegister, accountType }).success, accountType).toBe(
        false,
      );
    }
  });

  it('kolom asing (role, is_demo) dibuang, tidak pernah sampai ke hasil', () => {
    const parsed = registerSchema.parse({ ...validRegister, role: 'admin', is_demo: 'true' });
    expect(parsed).not.toHaveProperty('role');
    expect(parsed).not.toHaveProperty('is_demo');
  });

  it('persetujuan wajib: tidak dicentang → pesan di kolom consent', () => {
    const { consent: _omit, ...rest } = validRegister;
    expect(errorsOf(registerSchema.safeParse(rest)).consent).toBe(
      'Centang persetujuan untuk melanjutkan.',
    );
    expect(
      errorsOf(registerSchema.safeParse({ ...validRegister, consent: 'off' })).consent,
    ).toBeDefined();
  });

  it('konfirmasi usia 17 tahun ke atas wajib dan dicatat terpisah dari persetujuan', () => {
    const { ageConfirmed: _omit, ...rest } = validRegister;
    expect(errorsOf(registerSchema.safeParse(rest)).ageConfirmed).toBe(
      'Centang bahwa kamu berusia 17 tahun ke atas.',
    );
    expect(
      errorsOf(registerSchema.safeParse({ ...validRegister, ageConfirmed: 'off' })).ageConfirmed,
    ).toBeDefined();
    // Persetujuan saja tidak cukup, dan konfirmasi usia saja pun tidak.
    expect(errorsOf(registerSchema.safeParse({ ...rest })).consent).toBeUndefined();
    const { consent: _c, ...withoutConsent } = validRegister;
    expect(errorsOf(registerSchema.safeParse(withoutConsent)).consent).toBeDefined();
    expect(errorsOf(registerSchema.safeParse(withoutConsent)).ageConfirmed).toBeUndefined();
  });

  it('kata sandi: minimal 8, maksimal 72, dan tidak boleh sama dengan email', () => {
    expect(
      errorsOf(registerSchema.safeParse({ ...validRegister, password: '1234567' })).password,
    ).toBe('Kata sandi minimal 8 karakter.');
    expect(
      errorsOf(registerSchema.safeParse({ ...validRegister, password: 'x'.repeat(73) })).password,
    ).toBe('Kata sandi maksimal 72 karakter.');
    expect(registerSchema.safeParse({ ...validRegister, password: 'x'.repeat(72) }).success).toBe(
      true,
    );
    expect(
      errorsOf(registerSchema.safeParse({ ...validRegister, password: 'rina@email.com' })).password,
    ).toMatch(/sama dengan emailmu/);
  });

  it.each([
    ['Rina Sari', true],
    ['Dr. Rina Sari, M.Psi.', true],
    ["Siti Nur'aini", true],
    ['Jean-Luc', true],
    ['Zoë Ångström', true],
    ['  Budi   Santoso  ', true],
    ['R', false],
    ['', false],
    ['<script>alert(1)</script>', false],
    ['Robert"); DROP TABLE profiles;--', false],
    ['12345', false],
    ['Rina\u0000Sari', false],
    ['x'.repeat(81), false],
  ])('nama %j diterima=%s', (name, ok) => {
    expect(registerSchema.safeParse({ ...validRegister, name }).success).toBe(ok);
  });

  it('spasi ganda dalam nama dirapikan', () => {
    expect(registerSchema.parse({ ...validRegister, name: '  Budi   Santoso ' }).name).toBe(
      'Budi Santoso',
    );
  });
});

describe('forgotPasswordSchema & resetPasswordSchema', () => {
  it('lupa sandi hanya butuh email yang valid', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'salah' }).success).toBe(false);
  });

  it('atur ulang: dua isian harus sama', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'sandi-baru-1', confirm: 'sandi-baru-1' }).success,
    ).toBe(true);
    const errors = errorsOf(
      resetPasswordSchema.safeParse({ password: 'sandi-baru-1', confirm: 'beda-sekali' }),
    );
    expect(errors.confirm).toMatch(/belum sama/);
  });

  it('atur ulang: aturan panjang sandi sama dengan pendaftaran', () => {
    expect(
      errorsOf(resetPasswordSchema.safeParse({ password: 'pendek', confirm: 'pendek' })).password,
    ).toBe('Kata sandi minimal 8 karakter.');
  });
});

describe('pickFields', () => {
  it('hanya mengambil kolom yang diminta; File dan kolom asing diabaikan', () => {
    const data = new FormData();
    data.set('email', 'a@b.co');
    data.set('role', 'admin');
    data.set('berkas', new File(['x'], 'x.txt'));
    expect(pickFields(data, ['email', 'berkas', 'password'])).toEqual({
      email: 'a@b.co',
      berkas: undefined,
      password: undefined,
    });
  });
});

describe('firstErrors', () => {
  it('mengambil pesan PERTAMA tiap kolom', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: '', password: '' });
    const errors = errorsOf(result);
    expect(errors.email).toBe('Isi alamat emailmu.');
    expect(Object.keys(errors).sort()).toEqual(['email', 'password']);
  });
});

describe('gaya bahasa pesan galat', () => {
  it('semua pesan memakai "kamu"/netral, tanpa tanda seru, tanpa kata klinis', () => {
    const results = [
      loginSchema.safeParse({}),
      registerSchema.safeParse({}),
      forgotPasswordSchema.safeParse({}),
      resetPasswordSchema.safeParse({}),
    ];
    for (const result of results) {
      if (result.success) continue;
      for (const issue of result.error.issues) {
        expect(issue.message).not.toMatch(/!|\banda\b|gangguan|diagnosa|pasien/i);
      }
    }
  });
});
