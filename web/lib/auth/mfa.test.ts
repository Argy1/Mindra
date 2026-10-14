import { describe, expect, it } from 'vitest';
import { USER_ROLES } from '@/lib/auth/roles';
import { decideMfa, MFA_REQUIRED_ROLES, normalizeMfaLevel, readMfaEnforcement } from './mfa';

describe('decideMfa', () => {
  it('psikolog tanpa faktor TOTP → daftar (enroll)', () => {
    expect(decideMfa('psychologist', { currentLevel: 'aal1', nextLevel: 'aal1' })).toBe('enroll');
  });

  it('psikolog punya faktor tetapi sesi baru aal1 → verifikasi (challenge)', () => {
    expect(decideMfa('psychologist', { currentLevel: 'aal1', nextLevel: 'aal2' })).toBe(
      'challenge',
    );
  });

  it('psikolog sesi aal2 → lolos', () => {
    expect(decideMfa('psychologist', { currentLevel: 'aal2', nextLevel: 'aal2' })).toBe('ok');
  });

  it('GAGAL TERTUTUP: AAL tidak terbaca → verifikasi, bukan lolos', () => {
    expect(decideMfa('psychologist', null)).toBe('challenge');
    expect(decideMfa('psychologist', { currentLevel: null, nextLevel: null })).toBe('challenge');
  });

  it('peran lain tidak dipaksa MFA oleh fungsi ini', () => {
    for (const role of USER_ROLES) {
      if (MFA_REQUIRED_ROLES.includes(role)) continue;
      expect(decideMfa(role, { currentLevel: 'aal1', nextLevel: 'aal1' }), role).toBe('ok');
    }
  });

  it('admin faskes juga wajib MFA (ditegakkan saat portalnya dibangun)', () => {
    expect(decideMfa('facility_admin', { currentLevel: 'aal1', nextLevel: 'aal1' })).toBe('enroll');
  });

  it('sakelar demo "off" melonggarkan, tetapi bawaannya wajib', () => {
    expect(decideMfa('psychologist', { currentLevel: 'aal1', nextLevel: 'aal1' }, 'off')).toBe(
      'ok',
    );
    expect(decideMfa('psychologist', { currentLevel: 'aal1', nextLevel: 'aal1' })).toBe('enroll');
  });
});

describe('normalizeMfaLevel', () => {
  it('hanya aal1 dan aal2 yang dikenali; sisanya dianggap tidak terbaca', () => {
    expect(normalizeMfaLevel('aal1')).toBe('aal1');
    expect(normalizeMfaLevel('aal2')).toBe('aal2');
    for (const value of [null, undefined, '', 'AAL2', 'aal3', 'aal2 ']) {
      expect(normalizeMfaLevel(value), String(value)).toBeNull();
    }
  });

  it('nilai tak dikenal tidak pernah meloloskan psikolog', () => {
    const level = normalizeMfaLevel('aal3');
    expect(decideMfa('psychologist', { currentLevel: level, nextLevel: level })).toBe('challenge');
  });
});

describe('readMfaEnforcement', () => {
  it('hanya persis "off" yang mematikan', () => {
    expect(readMfaEnforcement('off')).toBe('off');
    for (const value of [undefined, '', 'OFF', 'Off', 'false', '0', 'no', 'required', ' off']) {
      expect(readMfaEnforcement(value), String(value)).toBe('required');
    }
  });
});
