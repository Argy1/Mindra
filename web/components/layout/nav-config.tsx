import {
  BookOpen,
  CalendarBlank,
  CalendarHeart,
  ChartLine,
  ChatsCircle,
  ClipboardText,
  FileText,
  House,
  Key,
  Lifebuoy,
  LockKey,
  MapPin,
  MapTrifold,
  Notebook,
  ShieldCheck,
  SquaresFour,
  User,
  UserCheck,
  UserCircle,
  Users,
} from '@phosphor-icons/react/ssr';
// Hanya tipe (terhapus saat kompilasi); entry `ssr` tidak mengekspornya.
import type { Icon } from '@phosphor-icons/react/lib';

/** Peran yang punya AppShell (lihat docs/ARCHITECTURE.md §2). */
export type ShellRole = 'user' | 'psychologist' | 'caregiver' | 'facility_admin' | 'admin';

export interface NavItemDef {
  href: string;
  label: string;
  icon: Icon;
  /** Hanya aktif pada path persis (untuk halaman akar portal). */
  exact?: boolean;
}

export interface NavGroupDef {
  /** Judul grup kecil di sidebar (mis. "Akun"). Grup pertama biasanya tanpa judul. */
  label?: string;
  items: NavItemDef[];
}

export interface RoleNavDef {
  /** Tujuan logo. */
  homeHref: string;
  groups: NavGroupDef[];
  /** Maksimal 5 item; label dipendekkan seperti di mockup ("Cek", "Cerita", "Saya"). */
  bottom: NavItemDef[];
  /** Tampilkan tombol "Butuh bantuan sekarang" yang selalu terlihat. */
  showHelp: boolean;
}

/**
 * Navigasi per peran. `user` mengikuti design/app-beranda.html persis; `psychologist` dan
 * `facility_admin` mengikuti sidebar di psikolog-dashboard.html / faskes-dashboard.html.
 *
 * Semua href portal `facility_admin` (Tren, Peta, Laporan, Kunci API) dan `psychologist` (Ringkasan, Klien,
 * Jadwal, Keamanan) punya halaman. `admin` hanya meninjau akun psikolog (antrean) dan memasang TOTP. Catatan sesi dan Profil praktik dari mockup psikolog belum dibangun, jadi
 * tidak ditampilkan. `caregiver` belum punya mockup: sengaja dibuat minimal.
 */
export const SHELL_NAV: Record<ShellRole, RoleNavDef> = {
  user: {
    homeHref: '/beranda',
    showHelp: true,
    groups: [
      {
        items: [
          { href: '/beranda', label: 'Beranda', icon: House },
          { href: '/asesmen', label: 'Cek perasaan', icon: ClipboardText },
          { href: '/jurnal', label: 'Jurnal', icon: Notebook },
          { href: '/teman-cerita', label: 'Teman cerita', icon: ChatsCircle },
          { href: '/konsultasi', label: 'Konsultasi', icon: CalendarHeart },
          { href: '/privasi', label: 'Privasi dan izin', icon: LockKey },
        ],
      },
      {
        label: 'Bantuan',
        items: [
          { href: '/bantuan', label: 'Bantuan dan latihan', icon: Lifebuoy },
          { href: '/layanan-terdekat', label: 'Layanan terdekat', icon: MapPin },
        ],
      },
      {
        label: 'Akun',
        items: [{ href: '/profil', label: 'Profil', icon: UserCircle }],
      },
    ],
    bottom: [
      { href: '/beranda', label: 'Beranda', icon: House },
      { href: '/asesmen', label: 'Cek', icon: ClipboardText },
      { href: '/jurnal', label: 'Jurnal', icon: Notebook },
      { href: '/teman-cerita', label: 'Cerita', icon: ChatsCircle },
      { href: '/profil', label: 'Saya', icon: User },
    ],
  },
  psychologist: {
    homeHref: '/psikolog',
    showHelp: false,
    groups: [
      {
        items: [
          { href: '/psikolog', label: 'Ringkasan', icon: SquaresFour, exact: true },
          { href: '/psikolog/klien', label: 'Klien', icon: Users },
          { href: '/psikolog/jadwal', label: 'Jadwal', icon: CalendarBlank },
        ],
      },
      {
        label: 'Akun',
        items: [{ href: '/psikolog/keamanan', label: 'Keamanan', icon: ShieldCheck }],
      },
    ],
    bottom: [
      { href: '/psikolog', label: 'Ringkasan', icon: SquaresFour, exact: true },
      { href: '/psikolog/klien', label: 'Klien', icon: Users },
      { href: '/psikolog/jadwal', label: 'Jadwal', icon: CalendarBlank },
      { href: '/psikolog/keamanan', label: 'Keamanan', icon: ShieldCheck },
    ],
  },
  caregiver: {
    homeHref: '/pendamping',
    showHelp: true,
    groups: [{ items: [{ href: '/pendamping', label: 'Ringkasan', icon: House, exact: true }] }],
    bottom: [{ href: '/pendamping', label: 'Ringkasan', icon: House, exact: true }],
  },
  facility_admin: {
    homeHref: '/faskes',
    showHelp: false,
    groups: [
      {
        items: [
          { href: '/faskes', label: 'Tren wilayah', icon: ChartLine, exact: true },
          { href: '/faskes/peta', label: 'Peta layanan', icon: MapTrifold },
          { href: '/faskes/laporan', label: 'Laporan bulanan', icon: FileText },
        ],
      },
      {
        label: 'Integrasi',
        items: [
          { href: '/faskes/kunci-api', label: 'Kunci API', icon: Key },
          { href: '/developers', label: 'Dokumentasi API', icon: BookOpen },
        ],
      },
    ],
    bottom: [
      { href: '/faskes', label: 'Tren', icon: ChartLine, exact: true },
      { href: '/faskes/peta', label: 'Peta', icon: MapTrifold },
      { href: '/faskes/laporan', label: 'Laporan', icon: FileText },
      { href: '/faskes/kunci-api', label: 'API', icon: Key },
    ],
  },
  admin: {
    homeHref: '/admin',
    showHelp: false,
    groups: [
      {
        items: [{ href: '/admin', label: 'Antrean psikolog', icon: UserCheck, exact: true }],
      },
      {
        label: 'Akun',
        items: [{ href: '/admin/keamanan', label: 'Keamanan', icon: ShieldCheck }],
      },
    ],
    bottom: [
      { href: '/admin', label: 'Antrean', icon: UserCheck, exact: true },
      { href: '/admin/keamanan', label: 'Keamanan', icon: ShieldCheck },
    ],
  },
};
