import { describe, expect, it } from 'vitest';
import {
  CRISIS_RESOURCES,
  PRIMARY_CRISIS_RESOURCE,
  crisisCallLabel,
  type CrisisResource,
} from './resources';

describe('kontak krisis (sumber tunggal)', () => {
  it('punya setidaknya satu kontak, dan yang utama adalah yang pertama', () => {
    expect(CRISIS_RESOURCES.length).toBeGreaterThan(0);
    expect(CRISIS_RESOURCES[0]).toBe(PRIMARY_CRISIS_RESOURCE);
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

  it('kontak yang diverifikasi wajib mencatat tanggal verifikasinya', () => {
    for (const resource of CRISIS_RESOURCES) {
      if (resource.verified) expect(resource.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('label tombol memakai nomor dari data, bukan teks tetap', () => {
    expect(crisisCallLabel()).toBe(`Hubungi ${PRIMARY_CRISIS_RESOURCE.displayNumber}`);
  });
});
