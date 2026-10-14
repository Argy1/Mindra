import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      // Mockup statis dari desainer — acuan visual, bukan kode produksi.
      'design/**',
      // Skrip k6 berjalan di runtime k6 (bukan Node): import 'k6/http' dan global __ENV tidak dikenal ESLint.
      'load/read-endpoints.js',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // CLAUDE.md: tanpa `any`, tanpa console.log (data kesehatan tidak boleh bocor ke log).
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Aksesibilitas (bobot 15%): plugin jsx-a11y sudah dimuat oleh eslint-config-next,
      // di sini aturannya diperketat dari sekadar peringatan dasar.
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
    },
  },
  {
    // Klien service role MELEWATI RLS. CLAUDE.md: hanya boleh dipakai di lib/server/** (dan skrip
    // seed) untuk kasus yang terdokumentasi; semua akses data pengguna lewat klien bersesi.
    files: ['**/*.{ts,tsx}'],
    ignores: ['lib/server/**', 'scripts/**', 'tests/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/supabase-service', '**/supabase-service.ts'],
              message:
                'createServiceClient (service role, melewati RLS) hanya boleh diimpor dari lib/server/** atau scripts/**. Pakai lib/supabase/server.ts agar RLS menjaga data pengguna.',
            },
            {
              group: ['**/env/server'],
              message:
                'lib/env/server memuat rahasia server; impor hanya dari lib/server/** (tambahkan pembungkus di sana bila perlu).',
            },
          ],
        },
      ],
    },
  },
  {
    // Berkas konfigurasi & skrip boleh mencetak ke konsol.
    files: ['*.config.{js,mjs,ts}', 'scripts/**', 'load/**'],
    rules: { 'no-console': 'off' },
  },
];

export default eslintConfig;
