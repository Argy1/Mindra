// Dibungkus defineRoute (lib/api/handler.ts): validasi Zod, autentikasi, batas laju, jawaban SSE.
// Definisi operasi dan dokumentasinya ada di lib/api/routes; berkas ini hanya memasangnya ke Next.js.
import { mount } from '@/lib/api/handler';
import { companionChatRoute } from '@/lib/api/routes';

// Data per pengguna dan aliran: tidak boleh diprerender atau disimpan cache.
export const dynamic = 'force-dynamic';
// Balasan dialirkan dari model; beri waktu cukup (detik) sebelum fungsi dihentikan platform.
export const maxDuration = 60;

export const POST = mount(companionChatRoute);
