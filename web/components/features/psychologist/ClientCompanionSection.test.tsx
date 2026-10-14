import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CompanionActivity } from '@/lib/domain/psychologist/companion';
import { ClientCompanionSection } from './ClientCompanionSection';

const activity: CompanionActivity = {
  conversations: 6,
  messages: 52,
  activeDays: 4,
  crisisConversations: 1,
  lastActivity: '2026-10-13T00:50:00+00:00',
  windowDays: 30,
};

describe('ClientCompanionSection', () => {
  it('empat hitungan bernama dan nilainya', () => {
    render(<ClientCompanionSection activity={activity} />);
    const terms = Array.from(document.querySelectorAll('dt')).map((dt) => dt.textContent);
    const values = Array.from(document.querySelectorAll('dd')).map((dd) => dd.textContent);
    expect(terms).toEqual(['Percakapan', 'Pesan', 'Hari aktif', 'Bertanda krisis']);
    expect(values).toEqual(['6', '52', '4', '1']);
  });

  it('menyebut jendela hari dan waktu terakhir dalam WIB', () => {
    render(<ClientCompanionSection activity={activity} />);
    expect(screen.getByText(/Dalam 30 hari terakhir/)).toBeInTheDocument();
    const time = document.querySelector('time');
    expect(time).toHaveAttribute('dateTime', '2026-10-13T00:50:00+00:00');
    expect(time?.textContent).toContain('13 Oktober');
    expect(time?.textContent).toContain('07.50 WIB');
  });

  it('jendela lain dipakai apa adanya', () => {
    render(<ClientCompanionSection activity={{ ...activity, windowDays: 90 }} />);
    expect(screen.getByText(/Dalam 90 hari terakhir/)).toBeInTheDocument();
  });

  it('menyatakan bahwa isi percakapan tidak pernah dibagikan', () => {
    render(<ClientCompanionSection activity={activity} />);
    expect(screen.getByText(/Isi percakapan tidak pernah dibagikan/)).toBeInTheDocument();
  });

  it('tanpa percakapan: kalimat tunggal, tanpa kartu angka', () => {
    const { container } = render(
      <ClientCompanionSection
        activity={{
          conversations: 0,
          messages: 0,
          activeDays: 0,
          crisisConversations: 0,
          lastActivity: null,
          windowDays: 30,
        }}
      />,
    );
    expect(
      screen.getByText('Belum ada percakapan Teman cerita dalam 30 hari terakhir.'),
    ).toBeInTheDocument();
    expect(container.querySelector('dl')).toBeNull();
  });

  it('tanpa waktu terakhir: kalimat tetap utuh tanpa elemen waktu', () => {
    const { container } = render(
      <ClientCompanionSection activity={{ ...activity, lastActivity: null }} />,
    );
    expect(container.querySelector('time')).toBeNull();
    expect(within(container).getByText(/Dalam 30 hari terakhir\./)).toBeInTheDocument();
  });

  it('teks tanpa tanda seru dan tanpa istilah klinis terlarang', () => {
    const { container } = render(<ClientCompanionSection activity={activity} />);
    expect(container.textContent).not.toContain('!');
    expect(container.textContent).not.toMatch(/\b(gangguan|diagnosa|pasien)\b/i);
  });
});
