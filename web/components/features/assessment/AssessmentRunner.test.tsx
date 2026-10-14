import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INSTRUMENTS } from '@/lib/domain/assessment/instruments';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import { AssessmentRunner, type AssessmentSubmission } from './AssessmentRunner';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const phq9 = INSTRUMENTS.phq9;
const srq20 = INSTRUMENTS.srq20;

function setup(
  props: Partial<Parameters<typeof AssessmentRunner>[0]> & { instrument?: typeof phq9 } = {},
) {
  const onSubmit = vi.fn<(s: AssessmentSubmission) => Promise<{ status: 'ok'; id: string }>>(
    async () => ({ status: 'ok', id: 'abc' }),
  );
  const utils = render(<AssessmentRunner instrument={phq9} onSubmit={onSubmit} {...props} />);
  return { onSubmit, ...utils };
}

const heading = () => screen.getByRole('heading', { level: 1 });

/** Menjawab pertanyaan sekarang dengan tombol angka lalu menekan "Lanjut". */
async function answerWithKey(user: ReturnType<typeof userEvent.setup>, key: string) {
  await user.keyboard(key);
  await user.click(screen.getByRole('button', { name: /Lanjut|Lihat hasil/ }));
}

beforeEach(() => {
  push.mockClear();
});

describe('AssessmentRunner', () => {
  it('menampilkan satu pertanyaan per layar dengan progres dan pilihan yang bernomor', () => {
    setup();
    expect(heading()).toHaveTextContent(phq9.questions[0]!.text);
    expect(screen.getByRole('progressbar', { name: 'Pertanyaan 1 dari 9' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByText('Sama sekali tidak')).toBeInTheDocument();
    // Kelompok radio dinamai oleh pertanyaannya.
    expect(screen.getByRole('group', { name: phq9.questions[0]!.text })).toBeInTheDocument();
  });

  it('tombol 1–4 memilih jawaban ke-n dan memindahkan fokus ke pilihan itu', async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard('3');
    const radios = screen.getAllByRole('radio');
    expect(radios[2]).toBeChecked();
    expect(radios[2]).toHaveFocus();
    await user.keyboard('1');
    expect(radios[0]).toBeChecked();
    expect(radios[2]).not.toBeChecked();
  });

  it('angka di luar jumlah pilihan diabaikan (SRQ-20 hanya 2 pilihan)', async () => {
    const user = userEvent.setup();
    setup({ instrument: srq20 });
    await user.keyboard('4');
    expect(screen.getAllByRole('radio').some((radio) => (radio as HTMLInputElement).checked)).toBe(
      false,
    );
    await user.keyboard('2');
    expect(screen.getAllByRole('radio')[1]).toBeChecked();
  });

  it('Lanjut tanpa jawaban: pesan galat, fokus ke pilihan pertama, tidak pindah', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(screen.getByText('Pilih salah satu jawaban dulu, lalu lanjut.')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')[0]).toHaveFocus();
    expect(heading()).toHaveTextContent(phq9.questions[0]!.text);
  });

  it('Enter pada pilihan yang difokus = Lanjut (pengiriman implisit formulir)', async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard('2');
    await user.keyboard('{Enter}');
    expect(heading()).toHaveTextContent(phq9.questions[1]!.text);
    expect(screen.getByRole('progressbar', { name: 'Pertanyaan 2 dari 9' })).toBeInTheDocument();
  });

  it('fokus pindah ke judul pertanyaan baru supaya pembaca layar membacanya', async () => {
    const user = userEvent.setup();
    setup();
    await answerWithKey(user, '1');
    expect(heading()).toHaveFocus();
  });

  it('Sebelumnya kembali ke pertanyaan lalu mempertahankan jawaban; dinonaktifkan di pertanyaan pertama', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByRole('button', { name: /Sebelumnya/ })).toBeDisabled();
    await answerWithKey(user, '3');
    await user.click(screen.getByRole('button', { name: /Sebelumnya/ }));
    expect(heading()).toHaveTextContent(phq9.questions[0]!.text);
    expect(screen.getAllByRole('radio')[2]).toBeChecked();
  });

  it('menyelesaikan 9 pertanyaan: mengirim JAWABAN MENTAH tanpa skor atau kategori, lalu ke halaman hasil', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    for (let i = 0; i < 8; i += 1) await answerWithKey(user, '2'); // nilai 1
    await user.keyboard('4'); // butir 9 → nilai 3
    await user.click(screen.getByRole('button', { name: 'Lihat hasil' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submission = onSubmit.mock.calls[0]![0];
    expect(Object.keys(submission).sort()).toEqual(['answers', 'type']);
    expect(submission.type).toBe('phq9');
    expect(Object.keys(submission.answers)).toHaveLength(9);
    expect(submission.answers.phq9_1).toBe(1);
    expect(submission.answers.phq9_9).toBe(3);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/asesmen/hasil/abc'));
  });

  it('menunjukkan galat server dengan role="alert" dan mengizinkan kirim ulang', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<
        (
          s: AssessmentSubmission,
        ) => Promise<{ status: 'error'; message: string } | { status: 'ok'; id: string }>
      >()
      .mockResolvedValueOnce({ status: 'error', message: 'Sesimu sudah berakhir.' })
      .mockResolvedValueOnce({ status: 'ok', id: 'xyz' });
    render(<AssessmentRunner instrument={INSTRUMENTS.gad7} onSubmit={onSubmit} />);
    for (let i = 0; i < 6; i += 1) await answerWithKey(user, '1');
    await user.keyboard('1');
    await user.click(screen.getByRole('button', { name: 'Lihat hasil' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sesimu sudah berakhir.');
    await user.click(screen.getByRole('button', { name: 'Kirim lagi' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/asesmen/hasil/xyz'));
  });

  it('jaringan putus (aksi melempar) → pesan koneksi, bukan layar kosong', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('network'));
    render(<AssessmentRunner instrument={INSTRUMENTS.gad7} onSubmit={onSubmit} />);
    for (let i = 0; i < 6; i += 1) await answerWithKey(user, '1');
    await user.keyboard('1');
    await user.click(screen.getByRole('button', { name: 'Lihat hasil' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Koneksi terputus');
  });

  it('tidak bisa terkirim dua kali: tombol memuat dan klik berikutnya diabaikan', async () => {
    const user = userEvent.setup();
    let resolve!: (value: { status: 'ok'; id: string }) => void;
    const onSubmit = vi.fn(() => new Promise<{ status: 'ok'; id: string }>((r) => (resolve = r)));
    render(<AssessmentRunner instrument={INSTRUMENTS.gad7} onSubmit={onSubmit} />);
    for (let i = 0; i < 6; i += 1) await answerWithKey(user, '1');
    await user.keyboard('1');
    await user.click(screen.getByRole('button', { name: 'Lihat hasil' }));
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ status: 'ok', id: 'x' }));
  });

  describe('butir krisis', () => {
    async function goToItem9(user: ReturnType<typeof userEvent.setup>) {
      for (let i = 0; i < 8; i += 1) await answerWithKey(user, '1');
    }

    it('PHQ-9 butir 9 dijawab > 0: catatan lembut dengan nomor layanan dari sumber tunggal (role="status")', async () => {
      const user = userEvent.setup();
      setup();
      await goToItem9(user);
      await user.keyboard('2');
      const note = screen.getByRole('status');
      expect(note).toHaveTextContent(PRIMARY_CRISIS_RESOURCE.name);
      expect(note).toHaveTextContent(PRIMARY_CRISIS_RESOURCE.displayNumber);
      expect(screen.getByRole('link', { name: /Hubungi/ })).toHaveAttribute(
        'href',
        PRIMARY_CRISIS_RESOURCE.telHref,
      );
    });

    it('butir 9 dijawab "sama sekali tidak": tidak ada catatan', async () => {
      const user = userEvent.setup();
      setup();
      await goToItem9(user);
      await user.keyboard('1');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('pertanyaan biasa tidak pernah menampilkan catatan krisis, apa pun jawabannya', async () => {
      const user = userEvent.setup();
      setup();
      await user.keyboard('4');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('keluar', () => {
    it('belum menjawab apa pun: tautan langsung ke daftar', () => {
      setup();
      expect(screen.getByRole('link', { name: /Keluar/ })).toHaveAttribute('href', '/asesmen');
    });

    it('sudah menjawab: meminta konfirmasi (jawaban belum tersimpan)', async () => {
      const user = userEvent.setup();
      setup();
      await user.keyboard('2');
      await user.click(screen.getByRole('button', { name: /Keluar/ }));
      const dialog = await screen.findByRole('dialog', { name: 'Keluar dari skrining?' });
      expect(dialog).toHaveTextContent('Jawabanmu belum tersimpan');
      fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan mengisi' }));
      expect(screen.getAllByRole('radio')[1]).toBeChecked();
    });
  });
});
