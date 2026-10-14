import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';
import { Select } from './Select';
import { Textarea } from './Textarea';

describe('Input', () => {
  it('label terhubung ke kolom isian (bisa dicari lewat labelnya)', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('klik pada label memfokuskan kolom', async () => {
    render(<Input label="Email" />);
    await userEvent.click(screen.getByText('Email'));
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('teks bantuan menjadi deskripsi aksesibel', () => {
    render(<Input label="Email" helper="Dipakai untuk masuk." />);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Dipakai untuk masuk.');
  });

  it('galat: aria-invalid + deskripsi berisi pesan galat lebih dulu, lalu bantuan', () => {
    render(
      <Input label="Kata sandi" helper="Minimal 8 karakter." error="Kata sandi terlalu pendek." />,
    );
    const input = screen.getByLabelText('Kata sandi');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Kata sandi terlalu pendek. Minimal 8 karakter.');
  });

  it('tanpa galat tidak ada aria-invalid', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('wadah galat selalu ada di DOM sebagai wilayah live (supaya perubahannya diumumkan)', () => {
    const { container } = render(<Input label="Email" />);
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it('hideLabel menyembunyikan label secara visual tetapi tetap aksesibel', () => {
    render(<Input label="Cari klien" hideLabel />);
    expect(screen.getByText('Cari klien')).toHaveClass('sr-only');
    expect(screen.getByRole('textbox', { name: 'Cari klien' })).toBeInTheDocument();
  });

  it('optional menampilkan penanda (opsional)', () => {
    render(<Input label="Nomor telepon" optional />);
    expect(screen.getByText('(opsional)')).toBeInTheDocument();
  });

  it('aria-describedby dari pemanggil digabung, bukan menimpa', () => {
    render(<Input label="Email" helper="Bantuan." aria-describedby="catatan-lain" />);
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-describedby')).toContain('catatan-lain');
    expect(input.getAttribute('aria-describedby')).toContain('-helper');
  });

  it('meneruskan atribut native (type, autoComplete, required)', () => {
    render(<Input label="Email" type="email" autoComplete="email" required />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toBeRequired();
  });

  it('dua Input memiliki id yang berbeda', () => {
    render(
      <>
        <Input label="Satu" />
        <Input label="Dua" />
      </>,
    );
    expect(screen.getByLabelText('Satu').id).not.toBe(screen.getByLabelText('Dua').id);
  });
});

describe('Textarea', () => {
  it('label + galat bekerja sama seperti Input', () => {
    render(<Textarea label="Catatan" error="Terlalu panjang." />);
    const field = screen.getByRole('textbox', { name: 'Catatan' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Terlalu panjang.');
  });
});

describe('Select', () => {
  it('berupa combobox dengan nama dari label dan bisa memilih opsi', async () => {
    render(
      <Select label="Kota" defaultValue="bogor">
        <option value="bogor">Kota Bogor</option>
        <option value="depok">Kota Depok</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Kota' });
    await userEvent.selectOptions(select, 'depok');
    expect(select).toHaveValue('depok');
  });
});
