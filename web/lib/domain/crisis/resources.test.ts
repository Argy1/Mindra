import { describe, expect, it } from 'vitest';
import {
  CRISIS_RESOURCES,
  EMERGENCY_112,
  HEALING119_HOTLINE,
  PRIMARY_CRISIS_RESOURCE,
  crisisCallLabel,
  type CrisisResource,
} from './resources';

describe('kontak krisis (sumber tunggal)', () => {
  it('punya setidaknya satu kontak, dan yang utama adalah yang pertama', () => {
    expect(CRISIS_RESOURCES.length).toBeGreaterThan(0);
    expect(CRISIS_RESOURCES[0]).toBe(PRIMARY_CRISIS_RESOURCE);
  });

  it('urutan: Healing119.id (bicara dengan konselor) lebih dulu, lalu 112 (bahaya yang sedang terjadi)', () => {
    expect(CRISIS_RESOURCES.map((resource) => resource.displayNumber)).toEqual([
      '119 ext. 8',
      '112',
    ]);
    expect(CRISIS_RESOURCES.map((resource) => resource.telHref)).toEqual(['tel:119,8', 'tel:112']);
  });

  it('id unik', () => {
    const ids = CRISIS_RESOURCES.map((resource) => resource.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CRISIS_RESOURCES.map((resource) => [resource.id, resource] as const))(
    '%s: tautan tel: valid dan angkanya sama dengan yang ditampilkan',
    (_id, resource: CrisisResource) => {
      expect(resource.telHref).toMatch(/^tel:[0-9+,;#*]+$/);
      const shown = resource.displayNumber.replace(/\D/g, '');
      const dialled = resource.telHref.replace(/\D/g, '');
      expect(dialled).toBe(shown);
    },
  );

  it('kontak yang diverifikasi wajib mencatat tanggal dan sumber resmi verifikasinya', () => {
    for (const resource of CRISIS_RESOURCES) {
      if (resource.verified) {
        expect(resource.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(resource.sourceUrl).toMatch(/^https:\/\//);
      }
    }
  });

  describe('Healing119.id (119 ext. 8), diverifikasi ke halaman resmi Kemenkes pada 15 Okt 2026', () => {
    it('nama, nomor, penyelenggara, dan status verifikasi', () => {
      expect(HEALING119_HOTLINE).toMatchObject({
        name: 'Healing119.id',
        operator: 'Kementerian Kesehatan RI',
        displayNumber: '119 ext. 8',
        telHref: 'tel:119,8',
        verified: true,
        verifiedAt: '2026-10-15',
      });
      expect(new URL(HEALING119_HOTLINE.sourceUrl!).hostname).toBe('kesprimkom.kemkes.go.id');
    });

    it('jam layanan mengikuti sumber ("pagi hingga malam hari"), TIDAK mengklaim 24 jam', () => {
      // Sumber resmi menulis "beroperasi dari pagi hingga malam hari" dan tidak menyebut 24 jam. Klaim 24 jam
      // pada layanan krisis bisa membuat orang menelepon tengah malam dan tidak dijawab.
      expect(HEALING119_HOTLINE.availability).toBe('pagi hingga malam hari');
      expect(HEALING119_HOTLINE.availability).not.toMatch(/24/);
      expect(HEALING119_HOTLINE.description).not.toMatch(/24 jam/i);
    });

    it('deskripsi memakai kata sumber (dukungan psikologis awal, gratis, WhatsApp) tanpa menyebut SEJIWA', () => {
      expect(HEALING119_HOTLINE.description).toContain('Dukungan psikologis awal');
      expect(HEALING119_HOTLINE.description).toContain('WhatsApp');
      expect(HEALING119_HOTLINE.description).toContain('Gratis');
      expect(JSON.stringify(HEALING119_HOTLINE)).not.toMatch(/sejiwa/i);
    });
  });

  it('112 belum diverifikasi manusia dan tetap ditandai begitu', () => {
    expect(EMERGENCY_112).toMatchObject({ displayNumber: '112', verified: false });
    expect(EMERGENCY_112.verifiedAt).toBeUndefined();
  });

  it('cadangan 24 jam ada: 112 tersedia 24 jam, sehingga layanan jam terbatas punya jalan keluar', () => {
    expect(EMERGENCY_112.availability).toBe('24 jam');
  });

  it('label tombol memakai nomor dari data, bukan teks tetap', () => {
    expect(crisisCallLabel()).toBe(`Hubungi ${PRIMARY_CRISIS_RESOURCE.displayNumber}`);
  });
});
