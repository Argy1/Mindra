import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MarketingAuthActions } from './MarketingAuthActions';

function setCookie(value: string) {
  document.cookie = value;
}
afterEach(() => {
  setCookie('sb-abcdef-auth-token=; Max-Age=0; path=/');
});

describe('MarketingAuthActions', () => {
  it('pengunjung tanpa sesi: Masuk dan Daftar gratis', () => {
    render(<MarketingAuthActions />);
    expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/masuk');
    expect(screen.getByRole('link', { name: 'Daftar gratis' })).toHaveAttribute('href', '/daftar');
    expect(screen.queryByRole('link', { name: 'Ke dasbor' })).not.toBeInTheDocument();
  });

  it('ada cookie sesi: satu tombol "Ke dasbor" (tanpa Masuk / Daftar gratis)', () => {
    setCookie('sb-abcdef-auth-token=base64-eyJ; path=/');
    render(<MarketingAuthActions />);
    expect(screen.getByRole('link', { name: 'Ke dasbor' })).toHaveAttribute('href', '/masuk');
    expect(screen.queryByRole('link', { name: 'Daftar gratis' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Masuk' })).not.toBeInTheDocument();
  });
});
