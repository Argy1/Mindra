import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { CrisisBanner } from './CrisisBanner';

describe('CrisisBanner', () => {
  it('role="alert" dengan judul sebagai heading', () => {
    render(
      <CrisisBanner title="Kamu tidak harus menghadapinya sendirian.">
        <p>Bicara dengan seseorang sekarang bisa membantu.</p>
      </CrisisBanner>,
    );
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('Bicara dengan seseorang sekarang bisa membantu.');
    expect(
      screen.getByRole('heading', { name: 'Kamu tidak harus menghadapinya sendirian.' }),
    ).toBeInTheDocument();
  });

  it('menerima fokus saat muncul (bawaan)', () => {
    render(<CrisisBanner title="T">isi</CrisisBanner>);
    expect(screen.getByRole('alert')).toHaveFocus();
  });

  it('focusOnMount={false} tidak mencuri fokus', () => {
    render(
      <CrisisBanner title="T" focusOnMount={false}>
        isi
      </CrisisBanner>,
    );
    expect(screen.getByRole('alert')).not.toHaveFocus();
  });

  it('tombol panggilan utama diambil dari sumber tunggal kontak krisis', () => {
    render(<CrisisBanner title="T">isi</CrisisBanner>);
    const call = screen.getByRole('link', {
      name: `Hubungi ${PRIMARY_CRISIS_RESOURCE.displayNumber}`,
    });
    expect(call).toHaveAttribute('href', PRIMARY_CRISIS_RESOURCE.telHref);
  });

  it('menampilkan aksi tambahan dan catatan kaki', () => {
    render(
      <CrisisBanner
        title="T"
        actions={<button>Kabari psikolog</button>}
        footnote="Psikologmu sudah diberi tahu."
      >
        isi
      </CrisisBanner>,
    );
    expect(screen.getByRole('button', { name: 'Kabari psikolog' })).toBeInTheDocument();
    expect(screen.getByText('Psikologmu sudah diberi tahu.')).toBeInTheDocument();
  });
});
