import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './Alert';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { CategoryBadge } from './CategoryBadge';
import { Chip } from './Chip';
import { EmptyState } from './EmptyState';
import { IconButton } from './IconButton';
import { Progress } from './Progress';
import { SkeletonCard } from './SkeletonCard';

describe('Avatar', () => {
  it('menghitung inisial dari nama dan disembunyikan dari pembaca layar', () => {
    render(<Avatar name="Rina Sari, M.Psi." />);
    const avatar = screen.getByText('RS');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('dengan label menjadi gambar bernama (untuk avatar yang berdiri sendiri)', () => {
    render(<Avatar name="Ibu" label="Foto profil Ibu" />);
    expect(screen.getByRole('img', { name: 'Foto profil Ibu' })).toBeInTheDocument();
  });
});

describe('CategoryBadge', () => {
  it.each([
    ['minimal', 'Minimal'],
    ['mild', 'Ringan'],
    ['moderate', 'Sedang'],
    ['severe', 'Berat'],
  ] as const)('%s → teks "%s" (makna tidak hanya lewat warna)', (category, label) => {
    render(<CategoryBadge category={category} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('kategori berat memakai warna danger, sedang memakai warning', () => {
    const { rerender } = render(<CategoryBadge category="severe" />);
    expect(screen.getByText('Berat')).toHaveClass('bg-danger-50', 'text-danger-700');
    rerender(<CategoryBadge category="moderate" />);
    expect(screen.getByText('Sedang')).toHaveClass('bg-warning-50', 'text-warning-700');
  });
});

describe('Badge', () => {
  it('titik penanda bisa dimatikan', () => {
    render(<Badge dot={false}>Tanpa titik</Badge>);
    expect(screen.getByText('Tanpa titik').className).not.toContain('before:size-1.5');
  });
});

describe('Chip', () => {
  it('chip filter: aria-pressed mengikuti prop pressed', () => {
    const { rerender } = render(<Chip pressed={false}>Semua</Chip>);
    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'false');
    rerender(<Chip pressed>Semua</Chip>);
    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('chip aksi biasa tidak punya aria-pressed', () => {
    render(<Chip>Saran balasan</Chip>);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
  });
});

describe('IconButton', () => {
  it('nama aksesibel datang dari label', () => {
    render(
      <IconButton label="Notifikasi">
        <svg aria-hidden />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Notifikasi' })).toBeInTheDocument();
  });
});

describe('Progress', () => {
  it('menyampaikan nilai lewat atribut progressbar', () => {
    render(<Progress label="Pertanyaan 3 dari 9" value={3} max={9} />);
    const bar = screen.getByRole('progressbar', { name: 'Pertanyaan 3 dari 9' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '9');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('33.33333333333333%');
  });

  it('lebar dibatasi 0–100%', () => {
    const { rerender } = render(<Progress label="x" value={20} max={9} />);
    expect((screen.getByRole('progressbar').firstElementChild as HTMLElement).style.width).toBe(
      '100%',
    );
    rerender(<Progress label="x" value={-4} max={9} />);
    expect((screen.getByRole('progressbar').firstElementChild as HTMLElement).style.width).toBe(
      '0%',
    );
  });
});

describe('EmptyState', () => {
  it('judul, deskripsi, dan satu ajakan bertindak', () => {
    render(
      <EmptyState
        title="Belum ada catatan minggu ini"
        description="Mulai dengan satu check-in."
        action={<button>Mulai check-in</button>}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Belum ada catatan minggu ini', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mulai dengan satu check-in.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mulai check-in' })).toBeInTheDocument();
  });

  it('level heading bisa disesuaikan dengan struktur halaman', () => {
    render(<EmptyState title="Kosong" headingLevel="h2" />);
    expect(screen.getByRole('heading', { name: 'Kosong', level: 2 })).toBeInTheDocument();
  });
});

describe('SkeletonCard', () => {
  it('mengumumkan "Memuat…" ke pembaca layar dan menandai aria-busy', () => {
    render(<SkeletonCard />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Memuat…');
  });
});

describe('Alert', () => {
  it('tanpa role bawaan; judul memakai level heading yang diminta', () => {
    render(
      <Alert tone="info" title="Info" titleAs="h3">
        isi
      </Alert>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Info', level: 3 })).toBeInTheDocument();
  });
});
