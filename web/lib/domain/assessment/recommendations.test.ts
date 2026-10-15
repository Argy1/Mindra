import { describe, expect, it } from 'vitest';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { INSTRUMENT_IDS } from './instruments';
import { recommendationsFor } from './recommendations';
import { maxScoreFor, tierFor } from './scoring';

describe('rekomendasi (port AssessmentClinical.recommendationsFor)', () => {
  it('hasil berat menyarankan bantuan profesional dan menandainya sebagai highlight', () => {
    const recs = recommendationsFor('phq9', 25);
    expect(recs).toHaveLength(3);
    expect(recs.some((rec) => rec.highlight)).toBe(true);
    expect(recs.some((rec) => rec.id === 'consult-now' || rec.id === 'crisis-line')).toBe(true);
  });

  it('hasil berat menyertakan layanan krisis dari sumber tunggal, bukan nomor yang ditulis ulang', () => {
    const crisis = recommendationsFor('phq9', 25).find((rec) => rec.id === 'crisis-line');
    expect(crisis?.cta?.href).toBe(PRIMARY_CRISIS_RESOURCE.telHref);
    expect(crisis?.description).toContain(PRIMARY_CRISIS_RESOURCE.displayNumber);
    // Flutter melabeli 119 ext. 8 sebagai "Into The Light"; itu keliru (layanan Healing119.id).
    expect(crisis?.description).not.toMatch(/into the light/i);
  });

  it('hasil minimal menyarankan perawatan diri yang lembut, tanpa ajakan krisis', () => {
    const recs = recommendationsFor('phq9', 2);
    expect(recs).toHaveLength(3);
    expect(recs.some((rec) => rec.id === 'crisis-line')).toBe(false);
    expect(recs.some((rec) => rec.highlight)).toBe(false);
  });

  it('setiap tingkat yang bisa dicapai punya tepat 3 rekomendasi dengan id unik', () => {
    for (const id of INSTRUMENT_IDS) {
      for (let score = 0; score <= maxScoreFor(id); score += 1) {
        const recs = recommendationsFor(id, score);
        expect(recs, `${id} ${score}`).toHaveLength(3);
        expect(new Set(recs.map((rec) => rec.id)).size).toBe(3);
      }
    }
  });

  it('tingkat 2 dan 3 selalu memuat saran profesional yang ditandai highlight', () => {
    for (const id of INSTRUMENT_IDS) {
      for (let score = 0; score <= maxScoreFor(id); score += 1) {
        if (tierFor(id, score) >= 2) {
          expect(
            recommendationsFor(id, score).some((rec) => rec.highlight),
            `${id} ${score}`,
          ).toBe(true);
        }
      }
    }
  });

  it('tombol ajakan hanya mengarah ke rute yang sudah ada di web atau ke telepon', () => {
    const allowed = /^(\/jurnal|\/asesmen|tel:[0-9,+]+)$/;
    for (const id of INSTRUMENT_IDS) {
      for (let score = 0; score <= maxScoreFor(id); score += 1) {
        for (const rec of recommendationsFor(id, score)) {
          if (rec.cta) expect(rec.cta.href, `${id} ${score} ${rec.id}`).toMatch(allowed);
        }
      }
    }
  });

  it('teks rekomendasi bebas dari kata "gangguan", tanda seru, dan emoji', () => {
    for (const id of INSTRUMENT_IDS) {
      for (let score = 0; score <= maxScoreFor(id); score += 1) {
        for (const rec of recommendationsFor(id, score)) {
          for (const text of [rec.title, rec.description, rec.cta?.label ?? '']) {
            expect(text).not.toMatch(/gangguan/i);
            expect(text).not.toContain('!');
            expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
          }
        }
      }
    }
  });
});
