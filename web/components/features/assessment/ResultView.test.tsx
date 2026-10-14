import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { INSTRUMENT_IDS } from '@/lib/domain/assessment/instruments';
import { maxScoreFor } from '@/lib/domain/assessment/scoring';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { ResultView } from './ResultView';

const AT = '2026-10-13T10:00:00+07:00';
const history = (...scores: number[]) =>
  scores.map((score, index) => ({ score, completedAt: `2026-0${6 + index}-06T10:00:00+07:00` }));

describe('ResultView', () => {
  it('menampilkan skor, judul tingkat, penjelasan, dan catatan "bukan diagnosis"', () => {
    render(
      <ResultView
        instrumentId="phq9"
        score={11}
        completedAt={AT}
        crisis={false}
        history={history(11)}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Gejala depresi tingkat sedang' }),
    ).toBeInTheDocument();
    expect(screen.getByText('dari 27')).toBeInTheDocument();
    expect(screen.getByText(/Skor kamu:/)).toBeInTheDocument();
    expect(screen.getByText(/bukan diagnosis/)).toBeInTheDocument();
    expect(screen.getByText(/13 Oktober 2026/)).toBeInTheDocument();
  });

  it('TANPA banner krisis bila detektor tidak menandai (tidak ada role="alert")', () => {
    render(
      <ResultView
        instrumentId="phq9"
        score={20}
        completedAt={AT}
        crisis={false}
        history={history(20)}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('banner krisis role="alert" muncul PERTAMA, berfokus, dengan nomor dari sumber tunggal', () => {
    const { container } = render(
      <ResultView instrumentId="phq9" score={14} completedAt={AT} crisis history={history(14)} />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveFocus();
    expect(container.firstElementChild!.firstElementChild).toBe(alert);
    expect(
      within(alert).getByRole('heading', { name: 'Kamu tidak harus menghadapinya sendirian.' }),
    ).toBeInTheDocument();
    expect(within(alert).getByRole('link', { name: /Hubungi/ })).toHaveAttribute(
      'href',
      PRIMARY_CRISIS_RESOURCE.telHref,
    );
    expect(alert).toHaveTextContent(/lebih baik mati/);
  });

  it('SRQ-20 memakai kalimat krisis sendiri (mengakhiri hidup)', () => {
    render(
      <ResultView instrumentId="srq20" score={8} completedAt={AT} crisis history={history(8)} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/mengakhiri hidup/);
  });

  it('skrining pertama: tanpa grafik, mengajak mengulang; ada tren bila ≥ 2 hasil', () => {
    const { rerender } = render(
      <ResultView
        instrumentId="gad7"
        score={9}
        completedAt={AT}
        crisis={false}
        history={history(9)}
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/skrining GAD-7 pertamamu/)).toBeInTheDocument();

    rerender(
      <ResultView
        instrumentId="gad7"
        score={9}
        completedAt={AT}
        crisis={false}
        history={history(12, 9)}
      />,
    );
    expect(screen.getByRole('img', { name: 'Tren skor GAD-7: 12, 9' })).toBeInTheDocument();
    expect(screen.getByText('Turun 3 poin dari skrining sebelumnya.')).toBeInTheDocument();
  });

  it('selisih netral: naik, turun, dan sama', () => {
    const view = (scores: number[]) =>
      render(
        <ResultView
          instrumentId="pss10"
          score={scores.at(-1)!}
          completedAt={AT}
          crisis={false}
          history={history(...scores)}
        />,
      );
    view([10, 14]);
    expect(screen.getByText('Naik 4 poin dari skrining sebelumnya.')).toBeInTheDocument();
    view([14, 14]);
    expect(screen.getByText('Skornya sama dengan skrining sebelumnya.')).toBeInTheDocument();
  });

  it('setiap instrumen di skor minimum dan maksimum dirender tanpa galat dan tanpa tanda seru', () => {
    for (const id of INSTRUMENT_IDS) {
      for (const score of [0, maxScoreFor(id)]) {
        const { container, unmount } = render(
          <ResultView
            instrumentId={id}
            score={score}
            completedAt={AT}
            crisis={false}
            history={history(score)}
          />,
        );
        expect(container.textContent).not.toContain('!');
        expect(container.textContent).not.toMatch(/gangguan/i);
        unmount();
      }
    }
  });

  it('tombol ajakan layanan krisis di rekomendasi tingkat berat memakai telepon dari sumber tunggal', () => {
    render(
      <ResultView
        instrumentId="phq9"
        score={22}
        completedAt={AT}
        crisis={false}
        history={history(22)}
      />,
    );
    const links = screen.getAllByRole('link', { name: /Hubungi/ });
    expect(
      links.some((link) => link.getAttribute('href') === PRIMARY_CRISIS_RESOURCE.telHref),
    ).toBe(true);
  });
});
