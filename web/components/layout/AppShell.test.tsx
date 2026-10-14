import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { AppShell } from './AppShell';
import { SHELL_NAV, type ShellRole } from './nav-config';

const user = { name: 'Argy', roleLabel: 'Pengguna' };

function renderShell(props: Partial<ComponentProps<typeof AppShell>> = {}) {
  return render(
    <AppShell role="user" user={user} currentPath="/beranda" {...props}>
      <h1>Isi halaman</h1>
    </AppShell>,
  );
}

describe('AppShell', () => {
  it('menyediakan skip link ke <main id="isi"> yang bisa menerima fokus', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Langsung ke konten' })).toHaveAttribute(
      'href',
      '#isi',
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'isi');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(within(main).getByRole('heading', { name: 'Isi halaman' })).toBeInTheDocument();
  });

  it('sidebar user memuat 6 tujuan sesuai mockup, ditambah grup Bantuan (2) dan Akun (Profil)', () => {
    renderShell();
    const [sidebarNav] = screen.getAllByRole('navigation', { name: 'Navigasi utama' });
    const labels = within(sidebarNav!)
      .getAllByRole('link')
      .map((link) => link.textContent?.trim());
    expect(labels.filter((label) => label !== 'Mindra, ke beranda')).toEqual([
      'Beranda',
      'Cek perasaan',
      'Jurnal',
      'Teman cerita',
      'Konsultasi',
      'Privasi dan izin',
      'Bantuan dan latihan',
      'Layanan terdekat',
      'Profil',
    ]);
  });

  it('bottom nav memuat 5 item dengan label singkat', () => {
    renderShell();
    const navs = screen.getAllByRole('navigation', { name: 'Navigasi utama' });
    const bottom = navs[navs.length - 1]!;
    expect(bottom).toHaveAttribute('data-bottom-nav');
    expect(
      within(bottom)
        .getAllByRole('link')
        .map((l) => l.textContent?.trim()),
    ).toEqual(['Beranda', 'Cek', 'Jurnal', 'Cerita', 'Saya']);
  });

  it('menandai halaman aktif dengan aria-current="page" (hanya satu per navigasi)', () => {
    renderShell({ currentPath: '/asesmen/phq9' });
    const navs = screen.getAllByRole('navigation', { name: 'Navigasi utama' });
    for (const nav of navs) {
      const current = within(nav).getAllByRole('link', { current: 'page' });
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveAttribute('href', '/asesmen');
    }
  });

  it('role psikolog: item akar hanya aktif persis, dan lencana peringatan dibacakan lengkap', () => {
    renderShell({
      role: 'psychologist',
      currentPath: '/psikolog/klien/123',
      badges: { '/psikolog': { count: 1, label: 'peringatan terbuka' } },
    });
    const [sidebarNav] = screen.getAllByRole('navigation', { name: 'Navigasi utama' });
    const current = within(sidebarNav!).getAllByRole('link', { current: 'page' });
    expect(current.map((l) => l.getAttribute('href'))).toEqual(['/psikolog/klien']);
    expect(within(sidebarNav!).getByText('1 peringatan terbuka')).toHaveClass('sr-only');
  });

  it('judul grup "Akun" muncul untuk psikolog', () => {
    renderShell({ role: 'psychologist', currentPath: '/psikolog' });
    const [sidebarNav] = screen.getAllByRole('navigation', { name: 'Navigasi utama' });
    expect(within(sidebarNav!).getByText('Akun')).toBeInTheDocument();
  });

  it('menampilkan topbarStart dan topbarActions', () => {
    renderShell({
      topbarStart: <p>Selasa, 13 Oktober</p>,
      topbarActions: <button>Notifikasi</button>,
    });
    expect(screen.getByText('Selasa, 13 Oktober')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifikasi' })).toBeInTheDocument();
  });

  it('menampilkan nama dan peran pengguna', () => {
    renderShell();
    expect(screen.getByText('Argy')).toBeInTheDocument();
    expect(screen.getByText('Pengguna')).toBeInTheDocument();
  });

  describe('bantuan krisis', () => {
    it('role user: tombol "Butuh bantuan sekarang" ada di sidebar dan di topbar (mobile)', () => {
      renderShell();
      expect(screen.getAllByRole('button', { name: 'Butuh bantuan sekarang' })).toHaveLength(2);
    });

    it('role psikolog dan faskes tidak menampilkannya', () => {
      renderShell({ role: 'psychologist', currentPath: '/psikolog' });
      expect(
        screen.queryByRole('button', { name: 'Butuh bantuan sekarang' }),
      ).not.toBeInTheDocument();
    });

    it('membuka dialog berisi tombol panggilan dari sumber tunggal kontak krisis', async () => {
      renderShell();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await userEvent.click(screen.getAllByRole('button', { name: 'Butuh bantuan sekarang' })[0]!);
      const dialog = screen.getByRole('dialog', { name: 'Butuh bantuan sekarang' });
      const call = within(dialog).getByRole('link', {
        name: `Hubungi ${PRIMARY_CRISIS_RESOURCE.displayNumber}`,
      });
      expect(call).toHaveAttribute('href', PRIMARY_CRISIS_RESOURCE.telHref);
    });
  });
});

describe('konfigurasi navigasi per role', () => {
  const roles = Object.keys(SHELL_NAV) as ShellRole[];

  it.each(roles)('%s: href unik, bottom nav ≤ 5 item, dan homeHref valid', (role) => {
    const nav = SHELL_NAV[role];
    const hrefs = nav.groups.flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(nav.bottom.length).toBeGreaterThan(0);
    expect(nav.bottom.length).toBeLessThanOrEqual(5);
    expect(nav.homeHref).toMatch(/^\//);
    for (const item of [...hrefs, ...nav.bottom.map((i) => i.href)]) expect(item).toMatch(/^\//);
  });

  it('tombol bantuan krisis hanya untuk role yang melihat data sendiri/orang yang didampingi', () => {
    expect(roles.filter((role) => SHELL_NAV[role].showHelp).sort()).toEqual(['caregiver', 'user']);
  });
});
