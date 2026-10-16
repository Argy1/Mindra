import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DashboardView } from '@/lib/domain/faskes/dashboard';
import { buildStatCards, StatCards } from './StatCards';

const summary = (overrides: Partial<DashboardView['summary']> = {}): DashboardView['summary'] => ({
  weekStart: '2026-10-05',
  activeUsers: { value: 65, delta: 4 },
  avgPhq9: { value: 6.9, delta: -3.6 },
  severeShare: { value: 31, delta: 2 },
  crisisAlerts: 12,
  ...overrides,
});

describe('buildStatCards: periode tertulis di setiap kartu', () => {
  it('tiga kartu pertama menyebut pekan yang dipakai; kartu krisis menyebut seluruh periode', () => {
    const cards = buildStatCards(summary(), '12 minggu');
    expect(cards.map((card) => [card.label, card.period])).toEqual([
      ['warga aktif', 'pekan 5–11 Okt'],
      ['rata-rata skor PHQ-9', 'pekan 5–11 Okt'],
      ['skor sedang atau berat', 'pekan 5–11 Okt'],
      ['peringatan krisis', '12 minggu terakhir'],
    ]);
  });

  it('deltanya tetap menyebut pembandingnya (pekan sebelumnya)', () => {
    const [, phq] = buildStatCards(summary(), '12 minggu');
    expect(phq!.value).toBe('6,9');
    expect(phq!.delta?.text).toBe('turun 3,6 poin dibanding pekan sebelumnya');
  });

  it('tanpa pekan lengkap yang tampil: tetap ada keterangan, bukan kosong', () => {
    const cards = buildStatCards(summary({ weekStart: null }), '4 minggu');
    expect(cards[0]!.period).toBe('pekan terakhir');
    expect(cards[3]!.period).toBe('4 minggu terakhir');
  });

  it('dirender: label dan periode berada dalam satu istilah (dt)', () => {
    const { container } = render(<StatCards summary={summary()} periodLabel="1 tahun" />);
    const terms = Array.from(container.querySelectorAll('dt')).map((dt) => dt.textContent);
    expect(terms).toEqual([
      'warga aktifpekan 5–11 Okt',
      'rata-rata skor PHQ-9pekan 5–11 Okt',
      'skor sedang atau beratpekan 5–11 Okt',
      'peringatan krisis1 tahun terakhir',
    ]);
  });
});
