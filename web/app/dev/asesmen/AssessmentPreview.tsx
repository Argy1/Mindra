'use client';

import { useState } from 'react';
import {
  AssessmentRunner,
  type AssessmentSubmission,
} from '@/components/features/assessment/AssessmentRunner';
import type { Instrument } from '@/lib/domain/assessment/instruments';

/**
 * Pratinjau AssessmentRunner tanpa login dan tanpa database. "Simpan" hanya menampilkan apa yang
 * AKAN dikirim ke server, sehingga mudah diperiksa bahwa yang dikirim jawaban mentah saja (bukan skor).
 * Nama tombol/teks dibiarkan sama dengan versi sungguhan supaya tes e2e menguji komponen yang sama.
 */
export function AssessmentPreview({ instrument }: { instrument: Instrument }) {
  const [sent, setSent] = useState<AssessmentSubmission | null>(null);

  if (sent) {
    return (
      <main id="isi" className="mx-auto max-w-reading px-gutter py-12">
        <h1 className="display-3">Pratinjau selesai</h1>
        <p className="mt-2 lead">
          Ini yang dikirim ke server. Perhatikan: tidak ada skor atau kategori.
        </p>
        <pre
          data-testid="payload"
          className="mt-6 overflow-x-auto rounded-md bg-sunken p-4 text-xs text-fg-2"
        >
          {JSON.stringify(sent)}
        </pre>
      </main>
    );
  }

  return (
    <AssessmentRunner
      instrument={instrument}
      exitHref="/dev/asesmen"
      onSubmit={async (submission) => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        setSent(submission);
        return { status: 'ok', id: 'pratinjau' };
      }}
      onDone={() => undefined}
    />
  );
}
