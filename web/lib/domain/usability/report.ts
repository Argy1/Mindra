import {
  SUS_BAND_LABEL,
  SUS_BENCHMARK,
  SUS_ITEMS,
  itemMeans,
  itemPenalty,
  summarizeSus,
  taskCompletion,
  type ParsedResponses,
  type SusBand,
  type SusSummary,
} from './sus';

/**
 * Laporan uji pengguna dalam Markdown (bahasa Indonesia) dari respons yang sudah diparse. Fungsi murni:
 * `scripts/sus-report.ts` hanya membaca berkas dan menulis hasil render ini.
 */

const PEOPLE = 'responden';
const fmt = (value: number) => String(value).replace('.', ',');

function summaryLine(label: string, summary: SusSummary): string {
  const ci = summary.ci95
    ? `${fmt(summary.ci95.low)} sampai ${fmt(summary.ci95.high)}`
    : 'tidak dihitung (n = 1)';
  return `| ${label} | ${summary.n} | ${fmt(summary.mean)} | ${fmt(summary.median)} | ${fmt(summary.sd)} | ${summary.min} sampai ${summary.max} | ${ci} | ${summary.aboveBenchmark.count} (${fmt(summary.aboveBenchmark.percent)}%) |`;
}

const SUMMARY_HEADER = [
  `| Kelompok | n | Rata-rata | Median | Simpangan baku | Rentang | Selang 95% rata-rata | Di atas ${SUS_BENCHMARK} |`,
  '| -------- | -: | --------: | -----: | -------------: | ------- | -------------------- | ------------: |',
];

/** Tabel pipa tidak boleh memuat | atau baris baru dari jawaban responden. */
const cell = (text: string) => text.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();

export function renderUsabilityReport(parsed: ParsedResponses): string {
  const { respondents, rejected } = parsed;
  const out: string[] = ['# Hasil uji pengguna (SUS)', ''];

  if (respondents.length === 0) {
    out.push('Belum ada respons yang valid.');
  } else {
    const all = summarizeSus(respondents.map((r) => r.score))!;
    const roles = [...new Set(respondents.map((r) => r.role))].sort();
    out.push(
      `${all.n} ${PEOPLE} valid. Skor SUS 0 sampai 100; patokan rata-rata industri ${SUS_BENCHMARK}.`,
      '',
      '## Skor SUS',
      '',
      ...SUMMARY_HEADER,
      summaryLine('Semua', all),
    );

    if (roles.length > 1) {
      for (const role of roles) {
        const group = respondents.filter((r) => r.role === role);
        out.push(summaryLine(role, summarizeSus(group.map((r) => r.score))!));
      }
    }

    out.push('', '| Kategori penerimaan | Jumlah |', '| ------------------- | -----: |');
    for (const band of Object.keys(all.bands) as SusBand[]) {
      out.push(`| ${SUS_BAND_LABEL[band]} | ${all.bands[band]} |`);
    }

    // Tugas pengguna dan profesional berbeda (kolom t1..t6 dipakai bersama), jadi dihitung per peran.
    out.push(
      '',
      '## Penyelesaian tugas',
      '',
      'Tugas per peran: lihat docs/UJI-PENGGUNA.md bagian 6.',
    );
    for (const role of roles) {
      const group = respondents.filter((r) => r.role === role);
      const rows = taskCompletion(group).filter((task) => task.attempted > 0);
      if (rows.length === 0) continue;
      out.push(
        '',
        `### ${role}`,
        '',
        '| Tugas | Mengerjakan | Selesai tanpa bantuan | Persen |',
        '| ----- | ----------: | --------------------: | -----: |',
        ...rows.map(
          (task) =>
            `| T${task.task} | ${task.attempted} | ${task.completed} | ${fmt(task.percent ?? 0)}% |`,
        ),
      );
    }

    const means = itemMeans(respondents.map((r) => r.answers));
    const ranked = means
      .map((mean, index) => ({ index, mean, penalty: itemPenalty(mean, index) }))
      .sort((a, b) => b.penalty - a.penalty);
    out.push(
      '',
      '## Butir yang paling menurunkan skor',
      '',
      'Kehilangan 0 sampai 4 poin per butir (butir bernomor ganjil dikurangi dari 5, genap dari 1). Prioritas perbaikan dimulai dari atas.',
      '',
      '| Butir | Pernyataan | Rata-rata jawaban | Kehilangan |',
      '| ----: | ---------- | ----------------: | ---------: |',
      ...ranked.map(
        (item) =>
          `| ${item.index + 1} | ${cell(SUS_ITEMS[item.index]!)} | ${fmt(item.mean)} | ${fmt(item.penalty)} |`,
      ),
    );

    const questions = [
      'Apa yang paling kamu suka?',
      'Apa yang paling membingungkan atau menyulitkan?',
      'Apa satu hal yang akan kamu ubah?',
    ];
    out.push(
      '',
      '## Jawaban terbuka',
      '',
      'Dikodekan secara manual menjadi tema dan temuan (lihat docs/UJI-PENGGUNA.md bagian 7).',
    );
    questions.forEach((question, index) => {
      const answers = respondents
        .map((r) => ({ id: r.id, text: r.open[index as 0 | 1 | 2] }))
        .filter((a) => a.text !== '');
      out.push('', `### ${index + 1}. ${question}`, '');
      if (answers.length === 0) out.push('_Tidak ada jawaban._');
      for (const answer of answers) out.push(`- ${answer.id}: ${cell(answer.text)}`);
    });
  }

  if (rejected.length > 0) {
    out.push(
      '',
      '## Baris yang ditolak',
      '',
      'Perbaiki di berkas sumber lalu jalankan ulang. Baris ini TIDAK ikut dihitung.',
      '',
    );
    for (const row of rejected) out.push(`- Baris ${row.line}: ${row.reason}`);
  }

  out.push(
    '',
    '## Catatan metode',
    '',
    '- Sampel kemudahan (bukan acak), jadi hasil menggambarkan responden ini, bukan seluruh pengguna.',
    '- Selang kepercayaan memakai distribusi t dan melebar tajam bila n kecil.',
    '- SUS mengukur kesan kemudahan pakai, bukan manfaat klinis.',
  );
  return `${out.join('\n')}\n`;
}
