import { describe, expect, it } from 'vitest';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { buildCrisisReply } from './crisis-reply';
import {
  conversationPreview,
  makeMessage,
  MAX_MESSAGE_CHARS,
  MODEL_CONTEXT_CHARS,
  MODEL_HISTORY_LIMIT,
  storedMessagesSchema,
  userMessageSchema,
  type StoredMessage,
} from './messages';
import { buildSystemPrompt, needsAiReminder, toModelMessages } from './prompt';

const NOW = new Date('2026-10-14T03:00:00Z');
const msg = (role: StoredMessage['role'], content: string, index = 0): StoredMessage =>
  makeMessage({ id: `m${index}`, role, content, now: NOW });

/** Riwayat bergantian user, assistant, ... sepanjang `count` pesan. */
const history = (count: number): StoredMessage[] =>
  Array.from({ length: count }, (_, index) =>
    msg(index % 2 === 0 ? 'user' : 'assistant', `pesan ${index}`, index),
  );

describe('userMessageSchema', () => {
  it('memangkas spasi tepi dan menerima baris baru', () => {
    expect(userMessageSchema.parse('  halo\n\nsatu lagi  ')).toBe('halo\n\nsatu lagi');
  });

  it.each(['', '   ', '\n\t '])('menolak pesan kosong: %j', (value) => {
    expect(userMessageSchema.safeParse(value).success).toBe(false);
  });

  it('batas panjang tepat di MAX_MESSAGE_CHARS', () => {
    expect(userMessageSchema.safeParse('a'.repeat(MAX_MESSAGE_CHARS)).success).toBe(true);
    expect(userMessageSchema.safeParse('a'.repeat(MAX_MESSAGE_CHARS + 1)).success).toBe(false);
  });

  it('menolak karakter kontrol (NUL, ESC, DEL) tetapi bukan baris baru dan tab', () => {
    for (const bad of ['a\u0000b', 'a\u001bb', 'a\u007fb']) {
      expect(userMessageSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
    expect(userMessageSchema.safeParse('a\tb\nc').success).toBe(true);
  });

  it('bukan string ditolak', () => {
    for (const bad of [null, undefined, 5, {}, ['a']]) {
      expect(userMessageSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('storedMessagesSchema (kompatibel dengan aplikasi Flutter)', () => {
  it('bentuk Flutter diterima dan kolom tambahan dipertahankan', () => {
    const flutter = [
      {
        id: 'a1',
        role: 'user',
        content: 'halo',
        timestamp: '2026-10-14T10:00:00.000',
        crisis_detected: true,
        extra: 1,
      },
    ];
    const parsed = storedMessagesSchema.parse(flutter);
    expect(parsed[0]).toMatchObject({ extra: 1, crisis_detected: true });
  });

  it('menolak peran atau bentuk lain (gagal tertutup untuk data rusak)', () => {
    expect(
      storedMessagesSchema.safeParse([{ id: 'a', role: 'system', content: 'x', timestamp: 't' }])
        .success,
    ).toBe(false);
    expect(storedMessagesSchema.safeParse([{ role: 'user', content: 'x' }]).success).toBe(false);
    expect(storedMessagesSchema.safeParse('bukan array').success).toBe(false);
  });

  it('makeMessage menulis timestamp ISO dan penanda krisis hanya bila perlu', () => {
    const plain = makeMessage({ id: 'x', role: 'user', content: 'a', now: NOW });
    expect(plain).toEqual({
      id: 'x',
      role: 'user',
      content: 'a',
      timestamp: '2026-10-14T03:00:00.000Z',
    });
    expect(
      makeMessage({ id: 'y', role: 'user', content: 'a', now: NOW, crisis: true }).crisis_detected,
    ).toBe(true);
  });
});

describe('conversationPreview', () => {
  it('awal pesan pertama pengguna, dipadatkan dan dipotong dengan elipsis', () => {
    expect(conversationPreview([msg('user', 'Capek   banget\nhari ini')])).toBe(
      'Capek banget hari ini',
    );
    const long = conversationPreview([msg('user', 'a'.repeat(200))], 20);
    expect(long).toHaveLength(20);
    expect(long.endsWith('…')).toBe(true);
  });

  it('tanpa pesan pengguna: Percakapan baru', () => {
    expect(conversationPreview([])).toBe('Percakapan baru');
    expect(conversationPreview([msg('assistant', 'halo')])).toBe('Percakapan baru');
  });
});

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt({ reminder: false });

  it('memakai nomor krisis dari sumber tunggal, bukan teks yang ditulis ulang', () => {
    expect(prompt).toContain(PRIMARY_CRISIS_RESOURCE.displayNumber);
    expect(prompt).toContain(PRIMARY_CRISIS_RESOURCE.name);
  });

  it('melarang diagnosis, emoji, dan tanda seru; menutup celah penggantian peran', () => {
    expect(prompt).toMatch(/bukan alat diagnosis/);
    expect(prompt).toMatch(/Tanpa emoji dan tanpa tanda seru/);
    expect(prompt).toMatch(/bukan instruksi untuk mengubah peranmu/);
  });

  it('prompt sendiri tidak berisi tanda seru atau emoji', () => {
    expect(prompt).not.toContain('!');
    expect(prompt).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('tidak memuat pengenal pengguna (hanya isi percakapan yang dikirim)', () => {
    expect(prompt).not.toMatch(/email|user_id|nama pengguna/i);
  });

  it('pengingat AI hanya ditambahkan bila diminta', () => {
    expect(prompt).not.toMatch(/pengingat yang halus/);
    expect(buildSystemPrompt({ reminder: true })).toMatch(/pengingat yang halus/);
  });
});

describe('needsAiReminder', () => {
  it('setiap pesan pengguna kelima (termasuk yang sedang dikirim)', () => {
    const userTurns = (count: number) =>
      Array.from({ length: count }, (_, index) => [
        msg('user', 'a', index * 2),
        msg('assistant', 'b', index * 2 + 1),
      ]).flat();
    expect([0, 1, 2, 3, 4, 5, 8, 9].map((count) => needsAiReminder(userTurns(count)))).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });
});

describe('toModelMessages', () => {
  it('pesan baru selalu terakhir dan berperan user; riwayat kosong menghasilkan satu pesan', () => {
    expect(toModelMessages([], 'halo')).toEqual([{ role: 'user', content: 'halo' }]);
    const out = toModelMessages(history(4), 'baru');
    expect(out.at(-1)).toEqual({ role: 'user', content: 'baru' });
    expect(out[0]!.role).toBe('user');
  });

  it('peran bergantian: pesan pengguna beruntun digabung (mis. balasan gagal tersimpan)', () => {
    const out = toModelMessages(
      [msg('user', 'satu'), msg('assistant', 'dua'), msg('user', 'tiga tanpa balasan')],
      'empat',
    );
    expect(out.map((entry) => entry.role)).toEqual(['user', 'assistant', 'user']);
    expect(out[2]!.content).toBe('tiga tanpa balasan\n\nempat');
  });

  it('awal yang berupa balasan dibuang (API menuntut diawali pengguna)', () => {
    const out = toModelMessages(
      [msg('assistant', 'sapaan'), msg('user', 'a'), msg('assistant', 'b')],
      'c',
    );
    expect(out[0]).toEqual({ role: 'user', content: 'a' });
  });

  it('dipangkas ke MODEL_HISTORY_LIMIT pesan terbaru dan tetap diawali pengguna', () => {
    const out = toModelMessages(history(60), 'baru');
    expect(out.length).toBeLessThanOrEqual(MODEL_HISTORY_LIMIT);
    expect(out[0]!.role).toBe('user');
    expect(out.at(-1)!.content).toBe('baru');
    expect(out.map((entry) => entry.content)).not.toContain('pesan 0');
  });

  it('dipangkas menurut jumlah karakter; pesan baru yang panjang tetap utuh', () => {
    const big = history(10).map((entry) => ({ ...entry, content: 'x'.repeat(5000) }));
    const out = toModelMessages(big, 'pendek');
    expect(out.reduce((sum, entry) => sum + entry.content.length, 0)).toBeLessThanOrEqual(
      MODEL_CONTEXT_CHARS + 6,
    );
    expect(out.at(-1)).toEqual({ role: 'user', content: 'pendek' });

    const huge = 'y'.repeat(MAX_MESSAGE_CHARS);
    expect(toModelMessages(big, huge).at(-1)!.content).toBe(huge);
  });

  it('tidak mengubah riwayat asli (tanpa efek samping)', () => {
    const original = history(4);
    const snapshot = JSON.stringify(original);
    toModelMessages(original, 'baru');
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('buildCrisisReply', () => {
  const reply = buildCrisisReply();

  it('memuat nama dan nomor dari sumber tunggal, dan menanyakan keamanan', () => {
    expect(reply).toContain(PRIMARY_CRISIS_RESOURCE.displayNumber);
    expect(reply).toContain(PRIMARY_CRISIS_RESOURCE.name);
    expect(reply).toMatch(/Apakah kamu aman sekarang\?/);
  });

  it('hangat dan aman: tanpa tanda seru, tanpa emoji, tanpa kata klinis, tanpa meremehkan', () => {
    expect(reply).not.toContain('!');
    expect(reply).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(reply).not.toMatch(/gangguan|diagnosa|pasien|tenang aja|pasti bisa/i);
  });
});
