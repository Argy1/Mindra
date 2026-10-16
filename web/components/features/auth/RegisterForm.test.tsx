import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from './RegisterForm';

vi.mock('@/lib/auth/actions', () => ({ signUpAction: vi.fn() }));

describe('RegisterForm: nomor STR untuk calon psikolog', () => {
  it('bawaan "untuk diriku sendiri": tidak ada kolom nomor STR', () => {
    render(<RegisterForm />);
    expect(screen.getByRole('radio', { name: /Untuk diriku sendiri/ })).toBeChecked();
    expect(screen.queryByLabelText(/Nomor STR/)).not.toBeInTheDocument();
  });

  it('memilih "Saya psikolog" memunculkan kolom Nomor STR yang wajib; kembali ke diri sendiri menyembunyikannya', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole('radio', { name: /Saya psikolog/ }));
    const str = screen.getByLabelText(/Nomor STR/);
    expect(str).toBeRequired();
    expect(str).toHaveAttribute('name', 'strNumber');
    expect(str).toHaveAttribute('maxlength', '60');
    expect(screen.getByText(/mencocokkannya dengan sumber resmi/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Untuk diriku sendiri/ }));
    expect(screen.queryByLabelText(/Nomor STR/)).not.toBeInTheDocument();
  });

  it('pilihan jenis akun tetap satu: memilih psikolog melepas pilihan diri sendiri', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.click(screen.getByRole('radio', { name: /Saya psikolog/ }));
    expect(screen.getByRole('radio', { name: /Saya psikolog/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Untuk diriku sendiri/ })).not.toBeChecked();
  });
});
