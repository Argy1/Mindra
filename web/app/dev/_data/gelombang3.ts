import type { DirectoryFacility } from '@/lib/domain/faskes/nearest';

/**
 * Data contoh untuk pratinjau halaman Gelombang 3 (/dev/layanan-terdekat). 100% sintetis; nama, alamat, dan nomor
 * telepon tidak merujuk ke tempat atau nomor sungguhan.
 */
export const SAMPLE_DIRECTORY: DirectoryFacility[] = [
  {
    id: 'sample-1',
    name: 'Puskesmas Contoh Bogor Tengah',
    type: 'puskesmas',
    city: 'Kota Bogor',
    province: 'Jawa Barat',
    address: 'Jl. Contoh No. 1',
    phone: '(0251) 555-0101',
    lat: -6.595,
    lng: 106.8166,
  },
  {
    id: 'sample-2',
    name: 'Rumah Sakit Contoh Bandung',
    type: 'rumah_sakit',
    city: 'Kota Bandung',
    province: 'Jawa Barat',
    address: null,
    phone: '(022) 555-0102',
    lat: -6.9175,
    lng: 107.6191,
  },
  {
    id: 'sample-3',
    name: 'Klinik Contoh Jakarta Pusat',
    type: 'klinik',
    city: 'Kota Jakarta Pusat',
    province: 'DKI Jakarta',
    address: 'Jl. Contoh Raya No. 20',
    phone: null,
    lat: -6.1754,
    lng: 106.8272,
  },
  {
    id: 'sample-4',
    name: 'Biro Psikologi Contoh Surabaya',
    type: 'biro_psikologi',
    city: 'Kota Surabaya',
    province: 'Jawa Timur',
    address: 'Jl. Contoh Timur No. 5',
    phone: '(031) 555-0104',
    lat: -7.2575,
    lng: 112.7521,
  },
  {
    id: 'sample-5',
    name: 'Puskesmas Contoh Yogyakarta',
    type: 'puskesmas',
    city: 'Kota Yogyakarta',
    province: 'DI Yogyakarta',
    address: null,
    phone: null,
    lat: null,
    lng: null,
  },
];
