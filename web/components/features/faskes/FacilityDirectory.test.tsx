import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryFacility } from '@/lib/domain/faskes/nearest';
import { FacilityDirectory } from './FacilityDirectory';

const facility = (overrides: Partial<DirectoryFacility> & { id: string }): DirectoryFacility => ({
  name: `Layanan ${overrides.id}`,
  type: 'puskesmas',
  city: 'Kota Bogor',
  province: 'Jawa Barat',
  address: null,
  phone: null,
  lat: -6.595,
  lng: 106.8166,
  ...overrides,
});

const LIST: DirectoryFacility[] = [
  facility({
    id: 'bogor',
    name: 'Puskesmas Bogor Tengah',
    address: 'Jl. Contoh No. 1',
    phone: '(0251) 555-0101',
  }),
  facility({
    id: 'bandung',
    name: 'RS Jiwa Bandung',
    type: 'rumah_sakit',
    city: 'Kota Bandung',
    lat: -6.9175,
    lng: 107.6191,
  }),
  facility({
    id: 'surabaya',
    name: 'Klinik Surabaya',
    type: 'klinik',
    city: 'Kota Surabaya',
    province: 'Jawa Timur',
    lat: -7.2575,
    lng: 112.7521,
  }),
  facility({
    id: 'nowhere',
    name: 'Biro Tanpa Titik',
    type: 'biro_psikologi',
    lat: null,
    lng: null,
  }),
];

const names = () =>
  screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent?.trim() ?? '');

function mockGeolocation(
  behaviour: 'granted' | 'denied' | 'unavailable' | 'timeout',
  coords = { latitude: -6.6, longitude: 106.8 },
) {
  const getCurrentPosition = vi.fn(
    (success: PositionCallback, failure?: PositionErrorCallback, _options?: PositionOptions) => {
      if (behaviour === 'granted') success({ coords } as GeolocationPosition);
      else
        failure?.({
          code: behaviour === 'denied' ? 1 : behaviour === 'unavailable' ? 2 : 3,
        } as GeolocationPositionError);
    },
  );
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, 'geolocation');
  vi.restoreAllMocks();
});

describe('FacilityDirectory', () => {
  it('daftar tampil urut provinsi, kota, nama; jumlah diumumkan', () => {
    render(<FacilityDirectory facilities={LIST} verified />);
    // Provinsi: Jawa Barat (Kota Bandung, Kota Bogor: Biro, Puskesmas), Jawa Timur.
    expect(names()).toEqual([
      'RS Jiwa Bandung',
      'Biro Tanpa Titik',
      'Puskesmas Bogor Tengah',
      'Klinik Surabaya',
    ]);
    expect(screen.getByText(/Menampilkan 4 dari 4 layanan/)).toBeInTheDocument();
  });

  it('catatan "masih contoh" tampil bila belum terverifikasi dan hilang bila terverifikasi', () => {
    const { rerender } = render(<FacilityDirectory facilities={LIST} verified={false} />);
    const notice = screen.getByRole('heading', { name: 'Daftar ini masih contoh' });
    expect(notice).toBeInTheDocument();
    expect(screen.getByText(/119 ext\. 8/)).toBeInTheDocument();
    rerender(<FacilityDirectory facilities={LIST} verified />);
    expect(
      screen.queryByRole('heading', { name: 'Daftar ini masih contoh' }),
    ).not.toBeInTheDocument();
  });

  it('menyaring menurut provinsi dan mengumumkan jumlah baru', async () => {
    const user = userEvent.setup();
    render(<FacilityDirectory facilities={LIST} verified />);
    await user.selectOptions(screen.getByLabelText('Provinsi'), 'Jawa Timur');
    expect(names()).toEqual(['Klinik Surabaya']);
    expect(screen.getByText(/Menampilkan 1 dari 1 layanan \(total 4\)/)).toBeInTheDocument();
  });

  it('pilihan provinsi hanya memuat provinsi yang punya layanan', () => {
    render(<FacilityDirectory facilities={LIST} verified />);
    const options = within(screen.getByLabelText('Provinsi'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['Semua provinsi', 'Jawa Barat', 'Jawa Timur']);
  });

  it('mencari menurut nama, kota, atau alamat; tanpa hasil menampilkan ajakan, bukan jalan buntu', async () => {
    const user = userEvent.setup();
    render(<FacilityDirectory facilities={LIST} verified />);
    const search = screen.getByLabelText('Cari nama atau kota');
    await user.type(search, 'bandung');
    expect(names()).toEqual(['RS Jiwa Bandung']);
    await user.clear(search);
    await user.type(search, 'contoh no');
    expect(names()).toEqual(['Puskesmas Bogor Tengah']);
    await user.clear(search);
    await user.type(search, 'tidak ada');
    expect(
      screen.getByRole('heading', { name: 'Tidak ada layanan yang cocok' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/SEJIWA di 119 ext\. 8/)).toBeInTheDocument();
  });

  it('kartu: jenis, alamat, telepon sebagai tautan tel:, peta hanya bila ada koordinat', () => {
    render(<FacilityDirectory facilities={LIST} verified />);
    const bogor = screen.getByRole('article', { name: 'Puskesmas Bogor Tengah' });
    expect(within(bogor).getByText('Puskesmas')).toBeInTheDocument();
    expect(
      within(bogor).getByText(/Jl\. Contoh No\. 1, Kota Bogor, Jawa Barat/),
    ).toBeInTheDocument();
    expect(within(bogor).getByRole('link', { name: /Telepon/ })).toHaveAttribute(
      'href',
      'tel:02515550101',
    );
    const map = within(bogor).getByRole('link', { name: /Lihat di peta/ });
    expect(map.getAttribute('href')).toMatch(
      /^https:\/\/www\.openstreetmap\.org\/\?mlat=-6\.59500&mlon=106\.81660/,
    );
    expect(map).toHaveAttribute('target', '_blank');
    expect(map).toHaveAttribute('rel', 'noopener noreferrer');
    expect(map).toHaveAccessibleName(/buka di tab baru/);

    const nowhere = screen.getByRole('article', { name: 'Biro Tanpa Titik' });
    expect(within(nowhere).queryByRole('link', { name: /Lihat di peta/ })).not.toBeInTheDocument();
    expect(within(nowhere).queryByRole('link', { name: /Telepon/ })).not.toBeInTheDocument();
    expect(within(nowhere).getByText('Biro psikologi')).toBeInTheDocument();
  });

  it('tautan peta tidak memuat lokasi pengguna', async () => {
    mockGeolocation('granted', { latitude: -1.234567, longitude: 101.987654 });
    const user = userEvent.setup();
    render(<FacilityDirectory facilities={LIST} verified />);
    await user.click(screen.getByRole('button', { name: 'Urutkan dari lokasiku' }));
    for (const link of screen.getAllByRole('link', { name: /Lihat di peta/ })) {
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toContain('1.234567');
      expect(href).not.toContain('101.98');
    }
  });

  describe('lokasi', () => {
    it('diizinkan: diurutkan dari terdekat, jarak tampil, catatan privasi, dan bisa dihapus', async () => {
      const getCurrentPosition = mockGeolocation('granted');
      const user = userEvent.setup();
      render(<FacilityDirectory facilities={LIST} verified />);
      await user.click(screen.getByRole('button', { name: 'Urutkan dari lokasiku' }));

      expect(getCurrentPosition).toHaveBeenCalledOnce();
      expect(getCurrentPosition.mock.calls[0]?.[2]).toMatchObject({ enableHighAccuracy: false });
      expect(names()).toEqual([
        'Puskesmas Bogor Tengah',
        'RS Jiwa Bandung',
        'Klinik Surabaya',
        'Biro Tanpa Titik',
      ]);
      const first = screen.getByRole('article', { name: 'Puskesmas Bogor Tengah' });
      expect(within(first).getByText(/dari lokasimu \(garis lurus\)/)).toBeInTheDocument();
      expect(screen.getByText(/tidak dikirim ke server/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Hapus lokasiku' }));
      expect(screen.queryByText(/dari lokasimu \(garis lurus\)/)).not.toBeInTheDocument();
      expect(names()[0]).toBe('RS Jiwa Bandung');
      expect(screen.getByRole('button', { name: 'Urutkan dari lokasiku' })).toBeInTheDocument();
    });

    it('lokasi tidak pernah dikirim lewat jaringan', async () => {
      mockGeolocation('granted');
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const user = userEvent.setup();
      render(<FacilityDirectory facilities={LIST} verified />);
      await user.click(screen.getByRole('button', { name: 'Urutkan dari lokasiku' }));
      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it.each([
      ['denied', /Izin lokasi ditolak/],
      ['unavailable', /belum bisa ditentukan/],
      ['timeout', /terlalu lama/],
    ] as const)(
      '%s: pesan yang jelas dan daftar tetap bisa dipakai',
      async (behaviour, message) => {
        mockGeolocation(behaviour);
        const user = userEvent.setup();
        render(<FacilityDirectory facilities={LIST} verified />);
        await user.click(screen.getByRole('button', { name: 'Urutkan dari lokasiku' }));
        expect(screen.getByText(message)).toBeInTheDocument();
        expect(names()).toHaveLength(4);
        expect(screen.getByRole('button', { name: 'Urutkan dari lokasiku' })).toBeInTheDocument();
      },
    );

    it('peramban tanpa dukungan lokasi: pesan, bukan galat', async () => {
      const user = userEvent.setup();
      render(<FacilityDirectory facilities={LIST} verified />);
      await user.click(screen.getByRole('button', { name: 'Urutkan dari lokasiku' }));
      expect(screen.getByText(/tidak mendukung lokasi/)).toBeInTheDocument();
    });

    it('koordinat tak sah dari peramban ditolak', async () => {
      mockGeolocation('granted', { latitude: 999, longitude: 0 });
      const user = userEvent.setup();
      render(<FacilityDirectory facilities={LIST} verified />);
      await user.click(screen.getByRole('button', { name: 'Urutkan dari lokasiku' }));
      expect(screen.getByText(/belum bisa ditentukan/)).toBeInTheDocument();
      expect(screen.queryByText(/dari lokasimu/)).not.toBeInTheDocument();
    });
  });

  it('banyak hasil: 20 pertama, lalu "Tampilkan lebih banyak" menambah 20', async () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      facility({
        id: `n${String(i).padStart(2, '0')}`,
        name: `Layanan ${String(i).padStart(2, '0')}`,
      }),
    );
    const user = userEvent.setup();
    render(<FacilityDirectory facilities={many} verified />);
    expect(names()).toHaveLength(20);
    expect(screen.getByText(/Menampilkan 20 dari 45 layanan/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tampilkan lebih banyak' }));
    expect(names()).toHaveLength(40);
    await user.click(screen.getByRole('button', { name: 'Tampilkan lebih banyak' }));
    expect(names()).toHaveLength(45);
    expect(
      screen.queryByRole('button', { name: 'Tampilkan lebih banyak' }),
    ).not.toBeInTheDocument();
  });

  it('daftar punya judul tersembunyi level 2 (urutan judul tidak melompat dari h1 ke h3)', () => {
    render(<FacilityDirectory facilities={LIST} verified />);
    expect(screen.getByRole('heading', { level: 2, name: 'Daftar layanan' })).toBeInTheDocument();
  });

  it('mengganti provinsi mengembalikan daftar ke 20 pertama (bukan jumlah yang sudah dibuka)', async () => {
    const barat = Array.from({ length: 45 }, (_, i) =>
      facility({
        id: `b${String(i).padStart(2, '0')}`,
        name: `Barat ${String(i).padStart(2, '0')}`,
      }),
    );
    const timur = Array.from({ length: 30 }, (_, i) =>
      facility({
        id: `t${String(i).padStart(2, '0')}`,
        name: `Timur ${String(i).padStart(2, '0')}`,
        city: 'Kota Surabaya',
        province: 'Jawa Timur',
      }),
    );
    const user = userEvent.setup();
    render(<FacilityDirectory facilities={[...barat, ...timur]} verified />);
    await user.click(screen.getByRole('button', { name: 'Tampilkan lebih banyak' }));
    expect(names()).toHaveLength(40);
    await user.selectOptions(screen.getByLabelText('Provinsi'), 'Jawa Timur');
    expect(names()).toHaveLength(20);
    expect(screen.getByRole('button', { name: 'Tampilkan lebih banyak' })).toBeInTheDocument();
  });

  it('mengetik pencarian mengembalikan daftar ke 20 pertama', async () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      facility({
        id: `n${String(i).padStart(2, '0')}`,
        name: `Layanan ${String(i).padStart(2, '0')}`,
      }),
    );
    const user = userEvent.setup();
    render(<FacilityDirectory facilities={many} verified />);
    await user.click(screen.getByRole('button', { name: 'Tampilkan lebih banyak' }));
    expect(names()).toHaveLength(40);
    await user.type(screen.getByLabelText('Cari nama atau kota'), 'layanan');
    expect(names()).toHaveLength(20);
  });

  it('gagal memuat: pesan peringatan dengan jalan keluar ke SEJIWA, tanpa daftar kosong yang menyesatkan', () => {
    render(<FacilityDirectory facilities={[]} verified loadFailed />);
    expect(screen.getByRole('alert')).toHaveTextContent('Daftar layanan belum bisa dimuat');
    expect(screen.getByRole('alert')).toHaveTextContent('119 ext. 8');
    expect(screen.queryByLabelText('Provinsi')).not.toBeInTheDocument();
  });

  it('daftar kosong tanpa galat: ajakan, bukan galat', () => {
    render(<FacilityDirectory facilities={[]} verified />);
    expect(
      screen.getByRole('heading', { name: 'Tidak ada layanan yang cocok' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('teks tanpa tanda seru dan tanpa istilah klinis berat', () => {
    const { container } = render(<FacilityDirectory facilities={LIST} verified={false} />);
    expect(container.textContent).not.toContain('!');
    expect(container.textContent?.toLowerCase()).not.toMatch(/pasien|diagnosa|gangguan/);
  });
});
