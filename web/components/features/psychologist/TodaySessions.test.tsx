import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TodaySessions, type TodaySession } from './TodaySessions';

const NOW = new Date('2026-10-16T01:00:00Z');
const session = (status: string): TodaySession => ({
  id: status,
  patientId: 'p1',
  patientName: 'Alice',
  scheduledAt: '2026-10-16T08:00:00Z',
  durationMinutes: 50,
  status,
});

describe('TodaySessions: label status', () => {
  it('sesi confirmed tertulis "Terjadwal", sama dengan halaman Jadwal', () => {
    render(<TodaySessions sessions={[session('confirmed')]} now={NOW} />);
    expect(screen.getByText(/50 menit · Terjadwal/)).toBeInTheDocument();
    expect(screen.queryByText(/Terkonfirmasi/)).not.toBeInTheDocument();
  });

  it('pending dan ongoing memakai label yang sama dengan sumber tunggal', () => {
    render(<TodaySessions sessions={[session('pending'), session('ongoing')]} now={NOW} />);
    expect(screen.getByText(/Menunggu konfirmasi/)).toBeInTheDocument();
    expect(screen.getByText(/Sedang berlangsung/)).toBeInTheDocument();
  });
});
