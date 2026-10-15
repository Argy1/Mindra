import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';

/**
 * Panduan untuk pendamping. Isi dari `CaregiverTipModel.seeds` (Flutter), dengan perubahan:
 *   * emoji ❌/✓/🔴/🟡 diganti struktur daftar bertajuk (aturan UI: tanpa emoji; makna tidak
 *     boleh bergantung pada warna atau gambar),
 *   * nomor layanan krisis diambil dari sumber tunggal, bukan ditulis ulang ("119 ext 8" milik Healing119.id).
 */

export type CaregiverTipCategory = 'supporting' | 'communication' | 'crisis' | 'self_care';

export interface CaregiverTipSection {
  heading?: string;
  /** Paragraf bila `list` kosong. */
  text?: string;
  list?: readonly string[];
}

export interface CaregiverTip {
  id: string;
  title: string;
  category: CaregiverTipCategory;
  readMinutes: number;
  sections: readonly CaregiverTipSection[];
}

export const CAREGIVER_TIPS: readonly CaregiverTip[] = [
  {
    id: 'mendampingi-depresi',
    title: 'Cara mendampingi orang yang sedang terpuruk',
    category: 'supporting',
    readMinutes: 5,
    sections: [
      {
        text: 'Mendampingi seseorang yang sedang terpuruk bisa terasa membebani, tetapi kehadiranmu sangat berarti. Dengarkan tanpa menghakimi, jangan paksakan solusi, dan akui perasaannya. Ingat bahwa ini bukan kelemahan karakter. Ini kondisi yang butuh waktu dan dukungan profesional.',
      },
      {
        heading: 'Langkah praktis',
        list: [
          'Tanyakan "Apa yang kamu butuhkan sekarang?" daripada langsung memberi saran.',
          'Bantu dengan hal kecil yang konkret, seperti mengambilkan makan atau menemani ke dokter.',
          'Tetap hadir meski mereka menolak. Keberadaanmu tetap terasa.',
          'Hindari berkata "kamu punya banyak yang disyukuri", karena itu bisa meremehkan rasa sakitnya.',
        ],
      },
    ],
  },
  {
    id: 'kalimat-yang-membantu',
    title: 'Kalimat yang membantu dan yang sebaiknya dihindari',
    category: 'communication',
    readMinutes: 4,
    sections: [
      {
        text: 'Niat baik kadang tersampaikan dengan cara yang menyakitkan. Perhatikan kalimat yang kamu pilih saat berbicara dengan orang yang sedang berjuang dengan kesehatan mentalnya.',
      },
      {
        heading: 'Sebaiknya dihindari',
        list: [
          '"Kamu harus bersyukur, masih banyak yang lebih susah."',
          '"Sudahlah, lupakan saja."',
          '"Kamu terlalu sensitif."',
          '"Coba lebih rajin beribadah."',
          '"Kamu sendiri yang bikin dirimu sedih."',
        ],
      },
      {
        heading: 'Lebih membantu',
        list: [
          '"Aku di sini bersamamu."',
          '"Boleh aku tahu lebih banyak tentang yang kamu rasakan?"',
          '"Perasaanmu valid. Kamu tidak harus merasakannya sendirian."',
        ],
      },
    ],
  },
  {
    id: 'tanda-bahaya',
    title: 'Kapan harus mencari bantuan profesional',
    category: 'crisis',
    readMinutes: 5,
    sections: [
      {
        text: 'Sebagai pendamping, kenali tanda bahaya yang butuh tindakan segera.',
      },
      {
        heading: 'Tanda darurat',
        list: [
          'Berbicara tentang ingin mengakhiri hidup.',
          'Menyakiti diri sendiri.',
          'Menghilang dari kontak selama berhari-hari.',
          'Melihat atau mendengar hal yang tidak ada.',
        ],
      },
      {
        text: `Pada tanda darurat, hubungi layanan ${PRIMARY_CRISIS_RESOURCE.name} di ${PRIMARY_CRISIS_RESOURCE.displayNumber} (${PRIMARY_CRISIS_RESOURCE.availability}) atau bawa ke IGD terdekat. Jangan tinggalkan dia sendirian.`,
      },
      {
        heading: 'Segera cari psikolog atau psikiater jika',
        list: [
          'Gejala berlangsung lebih dari 2 minggu.',
          'Dia tidak bisa menjalani aktivitas sehari-hari.',
          'Dia menolak makan atau merawat diri.',
          'Dia memakai alkohol atau zat tertentu sebagai pelarian.',
        ],
      },
    ],
  },
  {
    id: 'merawat-diri-pendamping',
    title: 'Merawat dirimu sebagai pendamping',
    category: 'self_care',
    readMinutes: 5,
    sections: [
      {
        text: 'Kamu tidak bisa menuangkan dari cangkir yang kosong. Kelelahan sebagai pendamping itu nyata dan bisa berdampak serius pada kesehatanmu sendiri.',
      },
      {
        heading: 'Tanda kelelahan',
        list: [
          'Selalu lelah meski sudah cukup tidur.',
          'Mudah marah atau menangis tanpa alasan jelas.',
          'Menarik diri dari hubungan sosialmu sendiri.',
          'Merasa bersalah saat meluangkan waktu untuk dirimu.',
        ],
      },
      {
        heading: 'Cara memulihkan diri',
        list: [
          'Jadwalkan waktu untuk dirimu, minimal 30 menit sehari.',
          'Bergabung dengan kelompok dukungan pendamping.',
          'Ceritakan bebanmu pada orang yang kamu percaya.',
          'Pertimbangkan sesi konseling untuk dirimu sendiri.',
        ],
      },
    ],
  },
];

export const CAREGIVER_TIP_CATEGORY_LABEL: Readonly<Record<CaregiverTipCategory, string>> = {
  supporting: 'Mendampingi',
  communication: 'Berkomunikasi',
  crisis: 'Tanda bahaya',
  self_care: 'Merawat diri',
};
