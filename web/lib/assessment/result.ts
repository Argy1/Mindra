/** Hasil Server Action menyimpan asesmen. Berkas ini BUKAN "use server" supaya tipenya bisa diimpor klien. */
export type SubmitAssessmentResult =
  { status: 'ok'; id: string } | { status: 'error'; message: string };
