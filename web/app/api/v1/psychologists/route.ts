// Dibungkus defineRoute (lib/api/handler.ts): validasi Zod, autentikasi, batas laju, respons { data, error }.
// Definisi operasi dan dokumentasinya ada di lib/api/routes; berkas ini hanya memasangnya ke Next.js.
import { mount } from '@/lib/api/handler';
import { listPsychologistsRoute } from '@/lib/api/routes';

// Data per pengguna: tidak boleh diprerender.
export const dynamic = 'force-dynamic';

export const GET = mount(listPsychologistsRoute);
