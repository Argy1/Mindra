import { z } from 'zod';
import { ASSESSMENT_CATEGORIES } from '@/lib/domain/assessment/category';
import { INSTRUMENT_IDS } from '@/lib/domain/assessment/instruments';
import { userMessageSchema } from '@/lib/domain/companion/messages';
import { MOOD_TRIGGERS, MOOD_TYPES } from '@/lib/domain/journal/mood';
import { isRealDateKey } from '@/lib/utils/date';

/**
 * Skema permintaan dan respons API v1. Satu sumber untuk TIGA keperluan: validasi di handler,
 * dokumentasi OpenAPI (`z.toJSONSchema`), dan tes. Deskripsi (`.describe`) ikut ke OpenAPI.
 */

// ─── Dasar ────────────────────────────────────────────────────────────────────
export const instrumentIdSchema = z.enum(INSTRUMENT_IDS).describe('Jenis instrumen skrining.');
export const categorySchema = z
  .enum(ASSESSMENT_CATEGORIES)
  .describe('Kategori hasil: minimal, mild (ringan), moderate (sedang), severe (berat).');

const isoDateTime = z.string().describe('Waktu ISO 8601.');
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Format tanggal YYYY-MM-DD.' })
  .refine(isRealDateKey, { error: 'Tanggal tidak ada di kalender.' });

const limitQuery = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20)
  .describe('Jumlah item per halaman (1–100, bawaan 20).');
const cursorQuery = z
  .string()
  .max(300)
  .optional()
  .describe('Kursor dari `meta.nextCursor` respons sebelumnya.');

export const pageMetaSchema = z.object({
  nextCursor: z.string().nullable().describe('Kursor halaman berikutnya, atau null bila habis.'),
});

// ─── Instrumen ────────────────────────────────────────────────────────────────
export const instrumentCatalogSchema = z.array(
  z.object({
    id: instrumentIdSchema,
    name: z.string(),
    title: z.string(),
    description: z.string(),
    duration: z.string(),
    lead: z.string().describe('Kalimat pengantar periode, ditampilkan di atas setiap pertanyaan.'),
    maxScore: z.number().int().describe('Skor total maksimum.'),
    questions: z.array(
      z.object({
        id: z.string().describe('Kunci jawaban, mis. phq9_9.'),
        order: z.number().int(),
        text: z.string(),
        reverseScored: z.boolean().describe('True untuk PSS-10 butir 4, 5, 7, 8.'),
        options: z.array(z.object({ label: z.string(), value: z.number().int() })),
      }),
    ),
  }),
);

// ─── Asesmen ──────────────────────────────────────────────────────────────────
export const createAssessmentBody = z
  .object({
    type: instrumentIdSchema,
    answers: z
      .record(z.string(), z.number())
      .describe(
        'Jawaban MENTAH per butir ({ "phq9_1": 2, ... }), lengkap dan dalam rentang opsi. Skor dan kategori tidak pernah diterima dari klien: server menghitungnya.',
      ),
  })
  .strict();

export const crisisSchema = z.object({
  detected: z
    .boolean()
    .describe('True bila ada jawaban pada butir krisis (PHQ-9 butir 9 > 0, SRQ-20 butir 17 = ya).'),
  resource: z
    .object({
      name: z.string(),
      operator: z.string(),
      displayNumber: z.string(),
      telHref: z.string(),
      availability: z.string(),
    })
    .nullable()
    .describe('Layanan krisis yang WAJIB ditampilkan klien bila `detected` true.'),
});

export const assessmentResultSchema = z.object({
  id: z.uuid(),
  type: instrumentIdSchema,
  totalScore: z.number().int(),
  maxScore: z.number().int(),
  category: categorySchema,
  completedAt: isoDateTime,
  crisis: crisisSchema,
  recommendations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      highlight: z.boolean(),
    }),
  ),
  disclaimer: z
    .string()
    .describe('Selalu ditampilkan bersama hasil: ini skrining, bukan diagnosis.'),
});

export const assessmentsQuery = z
  .object({ limit: limitQuery, cursor: cursorQuery, type: instrumentIdSchema.optional() })
  .strict();

export const assessmentItemSchema = z.object({
  id: z.uuid(),
  type: instrumentIdSchema,
  totalScore: z.number().int(),
  category: categorySchema,
  completedAt: isoDateTime,
});

// ─── Mood dan tidur ───────────────────────────────────────────────────────────
export const MOOD_NOTE_MAX = 500;

export const createMoodBody = z
  .object({
    moodType: z.enum(MOOD_TYPES).describe('Perasaan.'),
    energyLevel: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(3)
      .describe('Tingkat energi 1–5 (bawaan 3).'),
    triggers: z.array(z.enum(MOOD_TRIGGERS)).max(MOOD_TRIGGERS.length).default([]),
    note: z.string().trim().max(MOOD_NOTE_MAX).default(''),
  })
  .strict();

export const moodItemSchema = z.object({
  id: z.uuid(),
  moodType: z.enum(MOOD_TYPES),
  energyLevel: z.number().int().nullable(),
  triggers: z.array(z.string()),
  note: z.string(),
  createdAt: isoDateTime,
});

export const createSleepBody = z
  .object({
    wakeDate: isoDate.describe('Tanggal bangun (WIB), YYYY-MM-DD.'),
    bedtime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .describe('Jam tidur WIB, HH:MM. Lebih larut dari jam bangun = malam sebelumnya.'),
    wakeTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .describe('Jam bangun WIB, HH:MM.'),
    quality: z.number().int().min(1).max(5).describe('Kualitas tidur 1–5.'),
    notes: z.string().trim().max(500).default(''),
  })
  .strict();

export const sleepItemSchema = z.object({
  id: z.uuid(),
  bedtime: isoDateTime,
  wakeTime: isoDateTime,
  quality: z.number().int(),
  notes: z.string(),
});

export const entriesQuery = z.object({ limit: limitQuery, cursor: cursorQuery }).strict();

// ─── Insight ──────────────────────────────────────────────────────────────────
export const weeklyInsightSchema = z.object({
  days: z.array(
    z.object({
      date: isoDate,
      dayLabel: z.string(),
      dayName: z.string(),
      isToday: z.boolean(),
      moodScore: z.number().nullable(),
      moodType: z.string().nullable(),
      sleepHours: z.number().nullable(),
    }),
  ),
  avgMood: z.number().nullable(),
  moodTrend: z.string(),
  avgSleepHours: z.number().nullable(),
  sleepTrend: z.string(),
  goodSleepNights: z.number().int(),
  checkInDays: z.number().int(),
  assessmentsDone: z.number().int(),
  streakDays: z.number().int(),
  hardestDay: z.object({ dayName: z.string(), moodType: z.string() }).nullable(),
  narrative: z.string(),
  patterns: z.array(z.string()),
  recommendation: z.string().nullable(),
  badges: z.array(z.string()),
});

// ─── FHIR ─────────────────────────────────────────────────────────────────────
export const fhirObservationQuery = z
  .object({
    patient: z.literal('me').default('me').describe('Hanya `me` (data milik pemilik token).'),
    _count: limitQuery,
    cursor: cursorQuery,
    _format: z.enum(['json', 'application/fhir+json']).optional(),
  })
  .strict();

/** Bundle FHIR R4 `searchset`; bentuk rinci ada di spesifikasi FHIR, dokumentasi memakai skema longgar. */
export const fhirBundleSchema = z
  .object({
    resourceType: z.literal('Bundle'),
    type: z.literal('searchset'),
    total: z.number().int(),
    link: z.array(z.object({ relation: z.string(), url: z.string() })),
    entry: z.array(
      z.object({
        fullUrl: z.string(),
        resource: z.object({ resourceType: z.literal('Observation') }).loose(),
        search: z.object({ mode: z.string() }),
      }),
    ),
  })
  .describe('FHIR R4 Bundle (searchset) berisi Observation hasil skrining.');

// ─── SATUSEHAT ────────────────────────────────────────────────────────────────
export const SATUSEHAT_MAX_BATCH = 10;

export const satusehatSyncBody = z
  .object({
    assessmentIds: z
      .array(z.uuid())
      .min(1)
      .max(SATUSEHAT_MAX_BATCH)
      .describe(
        `Hasil skrining yang ingin dikirim (maksimal ${SATUSEHAT_MAX_BATCH}). Kamu memilihnya sendiri; tidak ada yang dikirim otomatis.`,
      ),
  })
  .strict();

export const satusehatSyncResultSchema = z.object({
  mode: z
    .enum(['mock', 'staging'])
    .describe('`mock` = simulasi lokal, TIDAK ada data keluar dari server Mindra.'),
  results: z.array(
    z.object({
      assessmentId: z.uuid(),
      status: z.enum(['synced', 'already_synced', 'failed', 'not_found']),
      satusehatId: z.string().nullable(),
      message: z.string().nullable(),
    }),
  ),
});

// ─── Agregat faskes ───────────────────────────────────────────────────────────
export const aggregatesParams = z.object({ id: z.uuid() });
export const aggregatesQuery = z
  .object({
    from: isoDate.optional().describe('Awal rentang (YYYY-MM-DD). Bawaan: 84 hari sebelum `to`.'),
    to: isoDate.optional().describe('Akhir rentang (YYYY-MM-DD). Bawaan: hari ini (WIB).'),
  })
  .strict();

export const aggregateRowSchema = z.object({
  city: z.string().nullable(),
  province: z.string().nullable(),
  weekStart: isoDate,
  suppressed: z
    .boolean()
    .describe('True bila grup < 10 pengguna aktif: SEMUA angka null (k-anonymity).'),
  activeUsers: z.number().int().nullable(),
  avgPhq9: z.number().nullable(),
  avgGad7: z.number().nullable(),
  avgPss10: z.number().nullable(),
  minimalCount: z.number().int().nullable(),
  mildCount: z.number().int().nullable(),
  moderateCount: z.number().int().nullable(),
  severeCount: z.number().int().nullable(),
  crisisAlertCount: z.number().int().nullable(),
});

export const aggregatesResultSchema = z.object({
  facilityId: z.uuid(),
  from: isoDate,
  to: isoDate,
  kAnonymity: z.literal(10),
  rows: z.array(aggregateRowSchema),
});

// ─── Teman cerita ─────────────────────────────────────────────────────────────
export const companionChatBody = z
  .object({
    conversationId: z
      .uuid()
      .optional()
      .describe(
        'Id percakapan yang dilanjutkan. Kosong = percakapan baru (id-nya dikembalikan di peristiwa `meta`).',
      ),
    message: userMessageSchema.describe('Pesan pengguna, 1–2000 karakter.'),
  })
  .strict();

// ─── Konsultasi ───────────────────────────────────────────────────────────────
export const psychologistItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  title: z.string().describe('Gelar, mis. "M.Psi., Psikolog".'),
  specializations: z.array(z.string()),
  languages: z.array(z.string()).describe('Kode bahasa, mis. `id`, `en`.'),
  bio: z.string().nullable(),
  rating: z.number().describe('Penilaian rata-rata 0–5.'),
  reviews: z.number().int(),
  fee: z.number().int().describe('Tarif per sesi dalam rupiah; 0 = belum ditetapkan.'),
  verified: z.boolean().describe('Terverifikasi organisasi profesi.'),
  availableNow: z.boolean(),
});

export const psychologistsQuery = z.object({
  specialization: z
    .string()
    .trim()
    .max(60)
    .optional()
    .describe('Saring menurut spesialisasi (persis, tidak peka huruf).'),
  language: z.string().trim().max(8).optional().describe('Saring menurut kode bahasa.'),
  q: z.string().trim().max(60).optional().describe('Cari di nama, gelar, bio, dan spesialisasi.'),
  sort: z.enum(['rating', 'tarif', 'nama']).default('rating').describe('Urutan hasil.'),
});

export const slotsParams = z.object({ id: z.uuid().describe('Id psikolog.') });

export const slotsQuery = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1)
    .max(14)
    .default(7)
    .describe('Jumlah hari ke depan mulai hari ini WIB (1–14, bawaan 7).'),
});

export const slotsResultSchema = z.object({
  psychologistId: z.uuid(),
  timezone: z.literal('Asia/Jakarta'),
  sessionMinutes: z.number().int().describe('Lama satu sesi.'),
  days: z.array(
    z.object({
      date: z.string().describe('Tanggal WIB, YYYY-MM-DD.'),
      slots: z.array(
        z.object({
          startsAt: z
            .string()
            .describe(
              'Awal sesi, ISO 8601 dengan offset +07:00. Kirim nilai ini apa adanya saat memesan.',
            ),
          state: z
            .enum(['available', 'taken', 'too_soon', 'too_far'])
            .describe(
              '`available` bisa dipesan; `taken` sudah dipesan; `too_soon` kurang dari 1 jam lagi; `too_far` lebih dari 30 hari.',
            ),
        }),
      ),
    }),
  ),
});

export const bookConsultationBody = z
  .object({
    psychologistId: z.uuid().describe('Id psikolog dari `GET /psychologists`.'),
    startsAt: z.iso
      .datetime({ offset: true })
      .describe(
        'Awal sesi, persis salah satu `startsAt` berstatus `available` dari `GET /psychologists/{id}/slots`.',
      ),
  })
  .strict();

export const consultationResultSchema = z.object({
  id: z.uuid(),
  psychologistId: z.uuid(),
  startsAt: z.string().describe('Awal sesi, ISO 8601.'),
  durationMinutes: z.number().int(),
  fee: z
    .number()
    .int()
    .describe('Tarif tercatat, rupiah. Pembayaran belum tersedia di Mindra Web.'),
  status: z.string().describe('`confirmed` setelah berhasil dipesan.'),
});
