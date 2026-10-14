/// Wilayah domisili untuk statistik anonim (opt-in) dan aturan isiannya.
///
/// Daftar provinsi HARUS sama persis (isi dan penulisan) dengan `web/lib/domain/region/provinces.ts`: fungsi
/// database `facility_aggregate()` mencocokkan provinsi pengguna dengan provinsi faskes tanpa membedakan huruf besar
/// atau kecil, jadi penulisan yang berbeda berarti pengguna tidak pernah dihitung. Tes
/// `test/features/profile/region_test.dart` membaca berkas web itu dan membandingkannya.
library;

const List<String> kProvinces = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Kepulauan Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Banten',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Gorontalo',
  'Sulawesi Tengah',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Barat Daya',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
];

/// Penulisan kanonik dari masukan apa pun (abaikan huruf besar-kecil dan spasi ganda), atau null.
String? canonicalProvince(String? value) {
  if (value == null) return null;
  final key = value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
  if (key.isEmpty) return null;
  for (final province in kProvinces) {
    if (province.toLowerCase() == key) return province;
  }
  return null;
}

const int kCityMax = 80;
const int kNameMax = 80;

/// Huruf, angka, spasi, dan . ' , ( ) / - saja ("Kota Bogor", "Kab. Cianjur"). Sama dengan aturan web.
final RegExp _cityPattern = RegExp(
    r"^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\p{Zs}.'’,()/-]*$",
    unicode: true);

/// Huruf di awal, lalu huruf, spasi, dan . ' , - saja. Sama dengan aturan nama di web (lib/validation/auth.ts).
final RegExp _namePattern =
    RegExp(r"^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}.'’,-]*$", unicode: true);

String? validateName(String? value) {
  final name = (value ?? '').trim().replaceAll(RegExp(r'\s+'), ' ');
  if (name.isEmpty) return 'Isi namamu.';
  if (name.length < 2) return 'Nama minimal 2 huruf.';
  if (name.length > kNameMax) return 'Nama maksimal $kNameMax karakter.';
  if (!_namePattern.hasMatch(name)) {
    return 'Tulis namamu dengan huruf. Contoh: Rina Sari';
  }
  return null;
}

String? validateCity(String? value) {
  final city = (value ?? '').trim();
  if (city.isEmpty) return null; // opsional
  if (city.length > kCityMax) return 'Nama kota maksimal $kCityMax karakter.';
  if (!_cityPattern.hasMatch(city)) {
    return 'Tulis nama kota dengan huruf dan angka saja. Contoh: Kota Bogor atau Kab. Cianjur';
  }
  return null;
}

/// Kombinasi yang disyaratkan statistik wilayah: ikut berarti kota dan provinsi wajib terisi.
({String? city, String? province}) validateRegionConsent({
  required bool share,
  required String? city,
  required String? province,
}) {
  if (!share) return (city: null, province: null);
  return (
    city: (city ?? '').trim().isEmpty
        ? 'Isi kotamu untuk ikut statistik wilayah, atau matikan pilihan itu.'
        : null,
    province: canonicalProvince(province) == null
        ? 'Pilih provinsimu untuk ikut statistik wilayah, atau matikan pilihan itu.'
        : null,
  );
}

/// Kota yang disimpan: spasi dirapikan, kosong menjadi null.
String? normalizeCity(String? value) {
  final city = (value ?? '').trim().replaceAll(RegExp(r'\s+'), ' ');
  return city.isEmpty ? null : city;
}
