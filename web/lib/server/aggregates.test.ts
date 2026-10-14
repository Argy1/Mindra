// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { toAggregateRow } from './aggregates';

const base = {
  city: 'Bogor',
  province: 'Jawa Barat',
  week_start: '2026-10-05',
  suppressed: false,
  active_users: 14,
  avg_phq9: 8.4,
  avg_gad7: 6.1,
  avg_pss10: 19,
  minimal_count: 5,
  mild_count: 4,
  moderate_count: 3,
  severe_count: 2,
  crisis_alert_count: 1,
};

describe('toAggregateRow', () => {
  it('baris biasa dipetakan ke camelCase; numeric string dari Postgres menjadi angka', () => {
    const row = toAggregateRow({ ...base, avg_phq9: '8.40' as never, active_users: '14' as never });
    expect(row).toEqual({
      city: 'Bogor',
      province: 'Jawa Barat',
      weekStart: '2026-10-05',
      suppressed: false,
      activeUsers: 14,
      avgPhq9: 8.4,
      avgGad7: 6.1,
      avgPss10: 19,
      minimalCount: 5,
      mildCount: 4,
      moderateCount: 3,
      severeCount: 2,
      crisisAlertCount: 1,
    });
  });

  it('LAPIS KEDUA k-anonymity: baris suppressed dikosongkan walau database mengirim angka', () => {
    const row = toAggregateRow({ ...base, suppressed: true });
    expect(row.suppressed).toBe(true);
    for (const key of [
      'activeUsers',
      'avgPhq9',
      'avgGad7',
      'avgPss10',
      'minimalCount',
      'mildCount',
      'moderateCount',
      'severeCount',
      'crisisAlertCount',
    ] as const) {
      expect(row[key], key).toBeNull();
    }
    // Wilayah dan minggu tetap tampil: yang disembunyikan hanya angkanya.
    expect(row.city).toBe('Bogor');
  });

  it('metrik yang disembunyikan database (null) tetap null; nilai bukan angka menjadi null', () => {
    const row = toAggregateRow({ ...base, avg_gad7: null, avg_pss10: 'NaN' as never });
    expect(row.avgGad7).toBeNull();
    expect(row.avgPss10).toBeNull();
  });
});
