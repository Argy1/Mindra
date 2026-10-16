import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PortalSkeleton } from './PortalSkeleton';
import { PsychologistDetailSkeleton } from './PsychologistDetailSkeleton';

describe('kerangka pemuatan', () => {
  it('PortalSkeleton: satu status yang diumumkan, tanpa judul atau elemen yang bisa difokus', () => {
    const { container } = render(<PortalSkeleton />);
    const status = screen.getByRole('status', { name: 'Memuat halaman' });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Memuat…');
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    expect(
      container.querySelectorAll('a, button, input, select, textarea, [tabindex]'),
    ).toHaveLength(0);
    // Blok kerangka dekoratif: disembunyikan dari pembaca layar.
    for (const block of container.querySelectorAll('.animate-shimmer')) {
      expect(block).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('PortalSkeleton: jumlah kartu ringkasan bisa diatur', () => {
    const { container } = render(<PortalSkeleton stats={2} />);
    const stats = container.querySelector('[role="status"] > div.grid');
    expect(stats?.children).toHaveLength(2);
  });

  it('PsychologistDetailSkeleton: status bernama khusus profil dan jadwal psikolog', () => {
    render(<PsychologistDetailSkeleton />);
    expect(
      screen.getByRole('status', { name: 'Memuat profil dan jadwal psikolog' }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
  });
});

describe('loading.tsx tiap rute yang lambat (temuan uji live: perpindahan 5-8 detik tanpa tanda)', () => {
  const root = resolve(__dirname, '../..');
  it.each([
    ['portal psikolog', 'app/(psychologist)/psikolog/loading.tsx', 'PortalSkeleton'],
    ['portal faskes', 'app/(facility)/faskes/loading.tsx', 'PortalSkeleton'],
    ['portal admin', 'app/(admin)/admin/loading.tsx', 'PortalSkeleton'],
    [
      'detail psikolog di konsultasi',
      'app/(user)/(shell)/konsultasi/[id]/loading.tsx',
      'PsychologistDetailSkeleton',
    ],
  ])('%s punya loading.tsx yang memakai %s', (_name, file, component) => {
    const path = resolve(root, file);
    expect(existsSync(path), file).toBe(true);
    const source = readFileSync(path, 'utf8');
    expect(source).toContain(`export default function`);
    expect(source).toContain(`<${component}`);
  });

  it('loading.tsx portal psikolog berada DI ATAS gerbang MFA (grup (portal)) agar ikut menutup keterlambatan layout', () => {
    expect(existsSync(resolve(root, 'app/(psychologist)/psikolog/(portal)/loading.tsx'))).toBe(
      false,
    );
    expect(existsSync(resolve(root, 'app/(psychologist)/psikolog/loading.tsx'))).toBe(true);
  });
});
