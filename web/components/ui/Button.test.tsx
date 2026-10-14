import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('berupa <button type="button"> bawaan, bukan submit', () => {
    render(<Button>Simpan</Button>);
    expect(screen.getByRole('button', { name: 'Simpan' })).toHaveAttribute('type', 'button');
  });

  it('memanggil onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Simpan</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('memakai varian primary dan ukuran md secara bawaan', () => {
    render(<Button>Simpan</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-biru-500', 'min-h-12');
  });

  it('varian krisis memakai warna danger', () => {
    render(<Button variant="crisis">Hubungi</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger-500');
  });

  it('ukuran sm tetap punya area sentuh 44px lewat touch-target', () => {
    render(<Button size="sm">Kecil</Button>);
    expect(screen.getByRole('button')).toHaveClass('touch-target', 'min-h-10');
  });

  it('className dari pemanggil menimpa gaya bawaan', () => {
    render(<Button className="w-full">Lebar</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  describe('sebagai tautan', () => {
    it('href internal menjadi <a> dengan role link', () => {
      render(<Button href="/daftar">Daftar</Button>);
      expect(screen.getByRole('link', { name: 'Daftar' })).toHaveAttribute('href', '/daftar');
    });

    it('href tel: tidak lewat router dan tetap utuh', () => {
      render(<Button href="tel:119,8">Hubungi</Button>);
      expect(screen.getByRole('link', { name: 'Hubungi' })).toHaveAttribute('href', 'tel:119,8');
    });
  });

  describe('loading', () => {
    it('memberi tahu pembaca layar tetapi tetap bisa difokus', async () => {
      render(<Button loading>Menyimpan</Button>);
      const button = screen.getByRole('button', { name: 'Menyimpan' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toBeDisabled();
      await userEvent.tab();
      expect(button).toHaveFocus();
    });

    it('mengabaikan klik agar form tidak terkirim dua kali', async () => {
      const onClick = vi.fn();
      const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" loading onClick={onClick}>
            Kirim
          </Button>
        </form>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Kirim' }));
      expect(onClick).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('type="submit" tetap mengirim form saat tidak loading', async () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Kirim</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Kirim' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
