import { z } from 'zod';

/**
 * Berjalan di browser sebelum aplikasi dimuat (Next.js `instrumentation-client`), TIDAK di server.
 *
 * Zod 4 mengompilasi pemeriksa objek memakai `new Function` bila diizinkan, dan untuk itu ia mencoba
 * `Function("")` lebih dulu. CSP kita sengaja tanpa 'unsafe-eval' (lib/security/csp.ts), jadi percobaan itu
 * ditolak browser: galatnya ditangkap Zod, tetapi tetap tercatat sebagai `securitypolicyviolation` dan muncul
 * di panel Issues Chrome (menurunkan skor Lighthouse Best Practices dari 100 ke 96 di halaman berformulir).
 *
 * `jitless` membuat Zod melewati percobaan itu dan memakai pemeriksa biasa. Di browser selisih kecepatannya
 * tak terasa (formulir kecil); di server JIT tetap menyala. Bendera ini dibaca SAAT SKEMA DIBUAT, sehingga harus
 * diatur sebelum modul skema mana pun dimuat; itu sebabnya ia ada di sini, bukan di komponen.
 */
z.config({ jitless: true });
