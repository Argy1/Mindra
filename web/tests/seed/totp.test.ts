// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEMO_ACCOUNTS } from '../../scripts/seed/catalog';
import {
  TOTP_ROLES,
  decideReset,
  describeTotp,
  findTotpLoss,
  totpSnapshot,
} from '../../scripts/seed/totp';

/**
 * Akun psikolog, admin faskes, dan admin demo wajib TOTP; pemilik sudah memasangnya di Google Authenticator.
 * Tes ini membuktikan skrip seed tidak akan menghapusnya diam-diam.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const EMAILS = {
  psikolog: 'psikolog@demo.mindra.test',
  faskes: 'faskes@demo.mindra.test',
  admin: 'admin@demo.mindra.test',
};
const snapshot = (psikolog: number, faskes: number, admin: number) =>
  new Map([
    [EMAILS.psikolog, psikolog],
    [EMAILS.faskes, faskes],
    [EMAILS.admin, admin],
  ]);

describe('akun yang wajib TOTP', () => {
  it('tepat psikolog, admin faskes, dan admin (bukan pengguna, pendamping, atau calon psikolog)', () => {
    const required = DEMO_ACCOUNTS.filter((account) => TOTP_ROLES.has(account.role)).map(
      (account) => account.email,
    );
    expect(required.sort()).toEqual(Object.values(EMAILS).sort());
  });
});

describe('decideReset: --reset menghapus akun beserta TOTP-nya', () => {
  it('MENOLAK bila ada akun demo dengan TOTP terverifikasi, dan menyebut akunnya serta jalan keluarnya', () => {
    const decision = decideReset(snapshot(1, 1, 1), false);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toContain('psikolog=1');
      expect(decision.reason).toContain('admin=1');
      expect(decision.reason).toContain('--refresh');
      expect(decision.reason).toContain('--hapus-totp');
    }
  });

  it('MENOLAK bila hanya satu akun yang punya TOTP', () => {
    expect(decideReset(snapshot(0, 0, 1), false).allowed).toBe(false);
  });

  it('MENOLAK bila TOTP tidak bisa diperiksa (tidak bisa memastikan aman), kecuali diizinkan eksplisit', () => {
    const decision = decideReset(null, false);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toContain('tidak bisa diperiksa');
  });

  it('boleh bila tidak ada TOTP sama sekali (tidak ada yang hilang)', () => {
    expect(decideReset(snapshot(0, 0, 0), false)).toEqual({ allowed: true });
    expect(decideReset(new Map(), false)).toEqual({ allowed: true });
  });

  it('boleh bila pemilik memberi --hapus-totp, apa pun keadaannya', () => {
    expect(decideReset(snapshot(1, 1, 1), true)).toEqual({ allowed: true });
    expect(decideReset(null, true)).toEqual({ allowed: true });
  });
});

describe('findTotpLoss', () => {
  it('kosong bila jumlah TOTP sama atau bertambah', () => {
    expect(findTotpLoss(snapshot(1, 1, 1), snapshot(1, 1, 1))).toEqual([]);
    expect(findTotpLoss(snapshot(1, 1, 1), snapshot(2, 1, 1))).toEqual([]);
  });

  it('menyebut akun yang TOTP-nya berkurang, dan yang hilang dari pembacaan sesudahnya', () => {
    expect(findTotpLoss(snapshot(1, 1, 1), snapshot(1, 0, 1))).toEqual([EMAILS.faskes]);
    const missing = new Map([[EMAILS.psikolog, 1]]);
    expect(findTotpLoss(snapshot(1, 1, 1), missing).sort()).toEqual(
      [EMAILS.admin, EMAILS.faskes].sort(),
    );
  });

  it('akun yang memang belum punya TOTP bukan kehilangan', () => {
    expect(findTotpLoss(snapshot(0, 1, 1), snapshot(0, 1, 1))).toEqual([]);
  });
});

describe('totpSnapshot: hanya membaca faktor TOTP terverifikasi', () => {
  const profiles = [
    { id: 'p', email: EMAILS.psikolog },
    { id: 'f', email: EMAILS.faskes },
    { id: 'a', email: EMAILS.admin },
  ];
  const fake = (factorsByUser: Record<string, Array<{ status: string }>>, failFactors = false) => {
    const calls: string[] = [];
    const client = {
      from: () => ({
        select: () => ({ in: async () => ({ data: profiles, error: null }) }),
      }),
      auth: {
        admin: {
          mfa: {
            listFactors: async ({ userId }: { userId: string }) => {
              calls.push(`listFactors:${userId}`);
              if (failFactors) return { data: null, error: new Error('ditolak') };
              return { data: { factors: factorsByUser[userId] ?? [] }, error: null };
            },
          },
        },
      },
    };
    return { client: client as never, calls };
  };

  it('menghitung hanya faktor berstatus verified (yang belum diverifikasi tidak dihitung)', async () => {
    const { client } = fake({
      p: [{ status: 'verified' }, { status: 'unverified' }],
      f: [{ status: 'verified' }],
      a: [],
    });
    expect(await totpSnapshot(client)).toEqual(snapshot(1, 1, 0));
  });

  it('hanya memanggil listFactors (membaca): tidak ada pemanggilan lain pada API MFA', async () => {
    const { client, calls } = fake({ p: [{ status: 'verified' }], f: [], a: [] });
    await totpSnapshot(client);
    expect(calls.sort()).toEqual(['listFactors:a', 'listFactors:f', 'listFactors:p']);
  });

  it('gagal membaca menghasilkan null (bukan 0), sehingga --reset menolak', async () => {
    const { client } = fake({}, true);
    const result = await totpSnapshot(client);
    expect(result).toBeNull();
    expect(decideReset(result, false).allowed).toBe(false);
  });

  it('describeTotp ringkas dan tidak memuat domain email', () => {
    expect(describeTotp(snapshot(1, 0, 1))).toBe('psikolog=1, faskes=0, admin=1');
  });
});

describe('skrip seed: penghapusan akun hanya lewat --reset yang dijaga', () => {
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const seedSource = stripComments(read('../../scripts/seed.ts'));

  it('deleteUser hanya ada satu kali, di dalam reset(), SESUDAH keputusan decideReset', () => {
    expect(seedSource.match(/deleteUser/g)).toHaveLength(1);
    const resetStart = seedSource.indexOf('async function reset(');
    expect(resetStart).toBeGreaterThan(-1);
    const decide = seedSource.indexOf('decideReset(', resetStart);
    const del = seedSource.indexOf('deleteUser', resetStart);
    expect(decide).toBeGreaterThan(resetStart);
    expect(del).toBeGreaterThan(decide);
    // Penolakan menghentikan proses sebelum penghapusan.
    expect(seedSource.slice(decide, del)).toContain('fail(decision.reason)');
    // Keputusan diberi hasil pembacaan TOTP yang SUNGGUHAN (bukan peta kosong) dan izin eksplisit dari baris perintah.
    expect(seedSource).toContain('decideReset(await totpSnapshot(db), allowTotpLoss)');
  });

  it('tidak ada kode yang menghapus atau mengganti faktor MFA di skrip seed mana pun', () => {
    for (const file of [
      'seed.ts',
      'seed/refresh.ts',
      'seed/totp.ts',
      'seed/records.ts',
      'seed/catalog.ts',
    ]) {
      const source = stripComments(read(`../../scripts/${file}`));
      for (const forbidden of [
        'unenroll',
        'deleteFactor',
        'mfa.enroll',
        'updateUserById',
        'resetPassword',
      ]) {
        expect(source, `${file} memuat ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('--refresh memberi penyegaran klien yang hanya punya from, dan memeriksa TOTP sebelum dan sesudah', () => {
    const start = seedSource.indexOf('async function refresh(');
    const end = seedSource.indexOf('async function seed(');
    const body = seedSource.slice(start, end);
    expect(body).toContain('refreshDemoData({ from: db.from.bind(db) }');
    expect(body.indexOf('totpSnapshot(db)')).toBeLessThan(body.indexOf('refreshDemoData('));
    expect(body.lastIndexOf('totpSnapshot(db)')).toBeGreaterThan(body.indexOf('refreshDemoData('));
    expect(body).toContain('findTotpLoss(before, after)');
  });

  it('--add-accounts hanya membuat akun yang belum ada (dicocokkan lewat email)', () => {
    const start = seedSource.indexOf('async function addMissingAccounts(');
    const end = seedSource.indexOf('async function refresh(');
    const body = seedSource.slice(start, end);
    expect(body).toContain('if (existing.has(account.email)) continue;');
    expect(body.indexOf('existing.has(account.email)')).toBeLessThan(
      body.indexOf('createAuthUser('),
    );
  });
});
