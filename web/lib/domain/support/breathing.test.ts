import { describe, expect, it } from 'vitest';
import {
  BREATHING_CYCLES,
  BREATHING_PATTERN,
  breathPosition,
  cycleSeconds,
  totalMs,
  type BreathPhase,
} from './breathing';

const sec = (seconds: number) => seconds * 1000;

describe('pola napas', () => {
  it('4 detik tarik, 4 detik tahan, 6 detik hembus: hembusan lebih panjang dari tarikan', () => {
    expect(BREATHING_PATTERN.map((phase) => [phase.id, phase.seconds])).toEqual([
      ['in', 4],
      ['hold', 4],
      ['out', 6],
    ]);
    expect(cycleSeconds()).toBe(14);
    expect(BREATHING_CYCLES).toBe(5);
    expect(totalMs()).toBe(sec(70));
  });

  it('setiap fase punya label berbahasa Indonesia tanpa tanda seru', () => {
    for (const phase of BREATHING_PATTERN) {
      expect(phase.label).toMatch(/\S/);
      expect(phase.label).not.toContain('!');
    }
  });
});

describe('breathPosition', () => {
  it('detik 0: siklus 1, tarik napas, 4 detik tersisa', () => {
    expect(breathPosition(0)).toMatchObject({
      done: false,
      cycle: 1,
      cycles: 5,
      secondsLeft: 4,
      phase: { id: 'in' },
    });
  });

  it('hitungan mundur dibulatkan ke atas dan tidak pernah 0 selama berjalan', () => {
    expect(breathPosition(1).secondsLeft).toBe(4);
    expect(breathPosition(sec(1)).secondsLeft).toBe(3);
    expect(breathPosition(sec(3) + 1).secondsLeft).toBe(1);
    expect(breathPosition(sec(4) - 1).secondsLeft).toBe(1);
    expect(breathPosition(sec(4) - 1).phase.id).toBe('in');
  });

  it('batas fase tepat: 4,000 detik masuk fase tahan; 8,000 masuk hembus; 14,000 masuk siklus 2', () => {
    expect(breathPosition(sec(4) - 1).phase.id).toBe('in');
    expect(breathPosition(sec(4)).phase.id).toBe('hold');
    expect(breathPosition(sec(8) - 1).phase.id).toBe('hold');
    expect(breathPosition(sec(8)).phase.id).toBe('out');
    expect(breathPosition(sec(14) - 1)).toMatchObject({ cycle: 1, phase: { id: 'out' } });
    expect(breathPosition(sec(14))).toMatchObject({
      cycle: 2,
      phase: { id: 'in' },
      secondsLeft: 4,
    });
  });

  it('siklus terakhir: sampai 70 detik; tepat 70 detik = selesai', () => {
    expect(breathPosition(sec(56))).toMatchObject({ cycle: 5, done: false });
    expect(breathPosition(sec(70) - 1)).toMatchObject({
      cycle: 5,
      done: false,
      phase: { id: 'out' },
    });
    expect(breathPosition(sec(70))).toMatchObject({ done: true, cycle: 5, secondsLeft: 0 });
    expect(breathPosition(sec(10_000))).toMatchObject({ done: true, cycle: 5 });
  });

  it('nilai negatif dan NaN dianggap awal; tak hingga dianggap selesai', () => {
    expect(breathPosition(-500)).toEqual(breathPosition(0));
    expect(breathPosition(Number.NaN)).toEqual(breathPosition(0));
    expect(breathPosition(Number.POSITIVE_INFINITY).done).toBe(true);
  });

  it('menerima pola dan jumlah siklus lain', () => {
    const pattern: readonly BreathPhase[] = [
      { id: 'in', label: 'Masuk', seconds: 2 },
      { id: 'out', label: 'Keluar', seconds: 3 },
    ];
    const options = { pattern, cycles: 2 };
    expect(totalMs(options)).toBe(sec(10));
    expect(breathPosition(sec(2), options)).toMatchObject({ cycle: 1, phase: { id: 'out' } });
    expect(breathPosition(sec(5), options)).toMatchObject({ cycle: 2, phase: { id: 'in' } });
    expect(breathPosition(sec(10), options)).toMatchObject({ done: true, cycle: 2 });
  });

  it('pola kosong ditolak dengan galat yang jelas', () => {
    expect(() => breathPosition(0, { pattern: [] })).toThrow('Pola napas');
  });
});
