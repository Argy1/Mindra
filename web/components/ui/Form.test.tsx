import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Alert } from './Alert';
import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { PasswordInput } from './PasswordInput';
import { RadioCard } from './RadioCard';
import { RadioGroup } from './RadioGroup';

describe('PasswordInput', () => {
  it('tersembunyi secara bawaan, tombol tampilkan/sembunyikan bernama jelas dan aria-pressed', async () => {
    render(<PasswordInput label="Kata sandi" autoComplete="current-password" />);
    const field = screen.getByLabelText('Kata sandi');
    expect(field).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: 'Tampilkan kata sandi' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(toggle);
    expect(field).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Sembunyikan kata sandi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('tombol tidak mengirim form (type=button) dan bisa dicapai dengan keyboard', async () => {
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <PasswordInput label="Kata sandi" />
      </form>,
    );
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('type', 'button');
    await userEvent.tab();
    await userEvent.tab();
    expect(toggle).toHaveFocus();
  });

  it('autocomplete dan galat diteruskan ke kolom', () => {
    render(
      <PasswordInput label="Kata sandi" autoComplete="new-password" error="Terlalu pendek." />,
    );
    const field = screen.getByLabelText('Kata sandi');
    expect(field).toHaveAttribute('autocomplete', 'new-password');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Terlalu pendek.');
  });
});

describe('Input endAdornment', () => {
  it('menyisipkan kontrol di dalam kolom tanpa memutus label', () => {
    render(<Input label="Cari" endAdornment={<button type="button">Hapus</button>} />);
    expect(screen.getByLabelText('Cari')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  it('label bisa diklik dan memuat tautan', async () => {
    render(
      <Checkbox
        name="consent"
        label={
          <>
            Saya setuju dengan <a href="/kebijakan-privasi">kebijakan privasi</a>.
          </>
        }
      />,
    );
    const box = screen.getByRole('checkbox');
    await userEvent.click(screen.getByText(/Saya setuju dengan/));
    expect(box).toBeChecked();
    expect(screen.getByRole('link', { name: 'kebijakan privasi' })).toHaveAttribute(
      'href',
      '/kebijakan-privasi',
    );
  });

  it('galat: aria-invalid + deskripsi', () => {
    render(
      <Checkbox name="consent" label="Setuju" error="Centang persetujuan untuk melanjutkan." />,
    );
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Centang persetujuan untuk melanjutkan.');
  });

  it('defaultChecked memulihkan centang setelah galat server', () => {
    render(<Checkbox name="consent" label="Setuju" defaultChecked />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

describe('RadioGroup + RadioCard', () => {
  function Example({ error }: { error?: string }) {
    return (
      <RadioGroup legend="Kamu mendaftar sebagai" {...(error ? { error } : {})}>
        <RadioCard name="accountType" value="self" label="Untuk diriku sendiri" defaultChecked />
        <RadioCard
          name="accountType"
          value="psychologist"
          label="Saya psikolog"
          description="Akunmu ditinjau dulu."
        />
      </RadioGroup>
    );
  }

  it('kelompok bernama dari <legend> dan berisi radio asli', () => {
    render(<Example />);
    const group = screen.getByRole('group', { name: 'Kamu mendaftar sebagai' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /Untuk diriku sendiri/ })).toBeChecked();
  });

  it('klik pada kartu memilihnya; panah keyboard berpindah (perilaku radio bawaan)', async () => {
    render(<Example />);
    await userEvent.click(screen.getByText('Saya psikolog'));
    expect(screen.getByRole('radio', { name: /Saya psikolog/ })).toBeChecked();

    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: /Untuk diriku sendiri/ })).toBeChecked();
  });

  it('keterangan menjadi bagian dari nama aksesibel pilihan', () => {
    render(<Example />);
    expect(
      screen.getByRole('radio', { name: /Saya psikolog.*Akunmu ditinjau dulu/ }),
    ).toBeInTheDocument();
  });

  it('galat kelompok terhubung lewat aria-describedby', () => {
    render(<Example error="Pilih salah satu." />);
    expect(screen.getByRole('group')).toHaveAccessibleDescription('Pilih salah satu.');
  });
});

describe('Alert: tone galat dan sukses', () => {
  it('error dan success tampil dengan teks (bukan hanya warna) dan bisa diberi role', () => {
    const { rerender } = render(
      <Alert tone="error" role="alert" compact>
        <p>Koneksi terputus.</p>
      </Alert>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Koneksi terputus.');
    expect(screen.getByRole('alert')).toHaveClass('bg-danger-50');

    rerender(
      <Alert tone="success" role="status" compact>
        <p>Tersimpan.</p>
      </Alert>,
    );
    expect(screen.getByRole('status')).toHaveClass('bg-success-50');
  });
});
