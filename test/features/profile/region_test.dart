import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mindra/features/profile/data/models/user_profile_model.dart';
import 'package:mindra/features/profile/domain/entities/user_profile_entity.dart';
import 'package:mindra/features/profile/domain/region.dart';

/// Wilayah, persetujuan statistik, dan aturan isian profil. Daftar provinsi dicocokkan dengan berkas web yang sama
/// yang dipakai halaman Profil web, karena fungsi database membandingkan penulisannya.
void main() {
  group('kProvinces', () {
    test('38 provinsi tanpa duplikat, tanpa spasi di tepi atau ganda', () {
      expect(kProvinces, hasLength(38));
      expect(kProvinces.map((p) => p.toLowerCase()).toSet(), hasLength(38));
      for (final province in kProvinces) {
        expect(province, province.trim().replaceAll(RegExp(r'\s+'), ' '));
      }
    });

    test(
        'SAMA persis (isi dan urutan) dengan daftar di web/lib/domain/region/provinces.ts',
        () {
      final file = File('web/lib/domain/region/provinces.ts');
      expect(file.existsSync(), isTrue,
          reason: 'jalankan tes dari folder induk proyek');
      final source = file.readAsStringSync();
      final block = RegExp(r'PROVINCES = \[(.*?)\] as const', dotAll: true)
          .firstMatch(source)!
          .group(1)!;
      final webList = RegExp(r"'([^']+)'")
          .allMatches(block)
          .map((m) => m.group(1)!)
          .toList();
      expect(kProvinces, webList);
    });
  });

  group('canonicalProvince', () {
    test('mengabaikan huruf besar-kecil dan spasi ganda', () {
      expect(canonicalProvince('jawa barat'), 'Jawa Barat');
      expect(canonicalProvince('  JAWA   BARAT '), 'Jawa Barat');
      expect(canonicalProvince('di yogyakarta'), 'DI Yogyakarta');
      expect(canonicalProvince('dki jakarta'), 'DKI Jakarta');
    });

    test('tidak dikenal atau kosong menghasilkan null', () {
      for (final value in [null, '', '   ', 'Jawa', 'Narnia', 'Yogyakarta']) {
        expect(canonicalProvince(value), isNull, reason: '$value');
      }
    });
  });

  group('validateCity', () {
    test('kosong sah (opsional); nama resmi sah', () {
      expect(validateCity(null), isNull);
      expect(validateCity('   '), isNull);
      expect(validateCity('Kota Bogor'), isNull);
      expect(validateCity('Kab. Cianjur'), isNull);
      expect(validateCity("Kota Jakarta Selatan (Jaksel)"), isNull);
    });

    test('tanda yang tak diizinkan dan terlalu panjang ditolak', () {
      expect(validateCity('Bogor<script>'), isNotNull);
      expect(validateCity('Kota; DROP TABLE'), isNotNull);
      expect(validateCity('-Bogor'), isNotNull);
      expect(validateCity('x' * (kCityMax + 1)), isNotNull);
      expect(validateCity('x' * kCityMax), isNull);
    });
  });

  group('validateName', () {
    test('sah: huruf, spasi, titik, koma, apostrof, tanda hubung', () {
      for (final name in [
        'Rina Sari',
        "Dewi O'Neil",
        'Ana-Maria',
        'Rina Sari, M.Psi.'
      ]) {
        expect(validateName(name), isNull, reason: name);
      }
    });

    test(
        'kosong, satu huruf, terlalu panjang, angka di awal, atau simbol ditolak',
        () {
      for (final name in [
        null,
        '',
        '  ',
        'A',
        'x' * (kNameMax + 1),
        '1Rina',
        'Rina<b>'
      ]) {
        expect(validateName(name), isNotNull, reason: '$name');
      }
    });
  });

  group('validateRegionConsent', () {
    test('tidak ikut: tidak ada syarat', () {
      expect(validateRegionConsent(share: false, city: null, province: null),
          (city: null, province: null));
    });

    test('ikut tanpa kota atau provinsi: pesan di masing-masing', () {
      final result =
          validateRegionConsent(share: true, city: '  ', province: 'Narnia');
      expect(result.city, contains('kotamu'));
      expect(result.province, contains('provinsimu'));
    });

    test('ikut dengan kota dan provinsi lengkap: sah', () {
      expect(
        validateRegionConsent(
            share: true, city: 'Kota Bogor', province: 'jawa barat'),
        (city: null, province: null),
      );
    });
  });

  test('normalizeCity merapikan spasi dan mengubah kosong menjadi null', () {
    expect(normalizeCity('  Kota   Bogor '), 'Kota Bogor');
    expect(normalizeCity('   '), isNull);
    expect(normalizeCity(null), isNull);
  });

  group('UserProfileModel', () {
    final base = <String, dynamic>{
      'id': 'u1',
      'email': 'a@b.c',
      'name': 'Rina'
    };

    test(
        'kolom baru bawaannya kosong dan persetujuan MATI bila tidak ada di baris',
        () {
      final profile = UserProfileModel.fromJson(base);
      expect(profile.province, isNull);
      expect(profile.shareRegionStats, isFalse);
    });

    test(
        'membaca domicile_province dan share_region_stats, menuliskannya kembali dengan nama kolom yang sama',
        () {
      final profile = UserProfileModel.fromJson({
        ...base,
        'city': 'Kota Bogor',
        'domicile_province': 'Jawa Barat',
        'share_region_stats': true,
      });
      expect(profile.city, 'Kota Bogor');
      expect(profile.province, 'Jawa Barat');
      expect(profile.shareRegionStats, isTrue);
      final json = profile.toJson();
      expect(json['domicile_province'], 'Jawa Barat');
      expect(json['share_region_stats'], true);
      expect(json['city'], 'Kota Bogor');
    });

    test('toJson TIDAK memuat kolom istimewa (role, is_demo, requested_role)',
        () {
      final json = UserProfileModel.fromJson(base).toJson();
      expect(json.keys, isNot(containsAll(['role'])));
      for (final key in ['role', 'is_demo', 'requested_role']) {
        expect(json.containsKey(key), isFalse, reason: key);
      }
    });
  });

  group('UserProfileEntity wilayah', () {
    const profile = UserProfileEntity(
      id: 'u1',
      email: 'a@b.c',
      name: 'Rina',
      city: 'Kota Bogor',
      province: 'Jawa Barat',
      shareRegionStats: true,
    );

    test('copyWith mempertahankan wilayah dan persetujuan', () {
      final renamed = profile.copyWith(name: 'Rina Sari');
      expect(renamed.name, 'Rina Sari');
      expect(renamed.city, 'Kota Bogor');
      expect(renamed.province, 'Jawa Barat');
      expect(renamed.shareRegionStats, isTrue);
    });

    test(
        'withRegion bisa MENGOSONGKAN kota dan provinsi (copyWith tidak bisa) dan mematikan persetujuan',
        () {
      final cleared = profile.withRegion(
          city: null, province: null, shareRegionStats: false);
      expect(cleared.city, isNull);
      expect(cleared.province, isNull);
      expect(cleared.shareRegionStats, isFalse);
      expect(cleared.name, 'Rina');
      expect(cleared.email, 'a@b.c');
    });
  });
}
