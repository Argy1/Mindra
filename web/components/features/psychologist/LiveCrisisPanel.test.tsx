import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertItem } from '@/lib/domain/psychologist/alerts';
import { createFakeRealtime, type FakeRealtime } from '@/lib/dev/fake-realtime';
import { LiveCrisisPanel } from './LiveCrisisPanel';

const refresh = vi.fn();
// Objek yang sama di setiap render: router Next.js stabil, dan efek langganan bergantung padanya.
const router = { refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const acknowledge = vi.fn();
vi.mock('@/lib/psychologist/actions', () => ({
  acknowledgeAlertAction: (...args: unknown[]) => acknowledge(...args),
}));

const DIMAS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NADIA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TODAY = '2026-10-13';
const clients = [
  { patientId: DIMAS, name: 'Dimas Pratama' },
  { patientId: NADIA, name: 'Nadia Azzahra' },
];

const existing: AlertItem = {
  id: '11111111-1111-4111-8111-111111111111',
  patientId: DIMAS,
  patientName: 'Dimas Pratama',
  severity: 'critical',
  source: 'assessment',
  reason:
    'PHQ-9 skor 17. Menjawab positif pada pertanyaan tentang pikiran lebih baik mati atau menyakiti diri.',
  createdAt: '2026-10-13T00:48:00Z',
};

const insert = (overrides: Record<string, unknown> = {}) => ({
  eventType: 'INSERT',
  new: {
    id: '22222222-2222-4222-8222-222222222222',
    user_id: NADIA,
    severity: 'high',
    status: 'open',
    source: 'assessment',
    created_at: '2026-10-13T02:10:00Z',
    ...overrides,
  },
});

let fake: FakeRealtime;

function setup(alerts: AlertItem[] = []) {
  fake = createFakeRealtime();
  return render(
    <LiveCrisisPanel
      alerts={alerts}
      watchedClients={clients}
      today={TODAY}
      createRealtimeClient={() => fake.client}
    />,
  );
}

/** Menunggu langganan realtime tersambung (efek mengambil sesi dulu, secara asinkron). */
const connected = () => screen.findByText('Terhubung langsung');

beforeEach(() => {
  refresh.mockClear();
  acknowledge.mockReset();
});

describe('LiveCrisisPanel: tampilan awal', () => {
  it('menampilkan peringatan dari server: nama, tingkat, alasan, sumber, dan tautan profil', async () => {
    setup([existing]);
    await connected();

    const item = screen.getByRole('listitem');
    expect(within(item).getByText('Dimas Pratama', { selector: 'strong' })).toBeInTheDocument();
    expect(within(item).getByText('Kritis')).toBeInTheDocument();
    expect(within(item).getByText(/PHQ-9 skor 17/)).toBeInTheDocument();
    expect(within(item).getByText(/Diisi lewat skrining Mindra, 07\.48 WIB/)).toBeInTheDocument();
    expect(within(item).getByRole('link', { name: /Buka profil/ })).toHaveAttribute(
      'href',
      `/psikolog/klien/${DIMAS}`,
    );
    expect(screen.getByText('1 terbuka')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Peringatan krisis, perlu ditindaklanjuti' }),
    ).toBeInTheDocument();
  });

  it('tanpa peringatan: pesan tenang, bukan daftar kosong', async () => {
    setup();
    await connected();
    expect(screen.getByText(/Tidak ada peringatan krisis yang terbuka/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('0 terbuka')).toBeInTheDocument();
  });
});

describe('LiveCrisisPanel: realtime', () => {
  it('peringatan baru muncul tanpa memuat ulang, diumumkan, lalu server diminta memuat rincian', async () => {
    setup();
    await connected();

    act(() => fake.emit(insert()));

    const item = await screen.findByRole('listitem');
    expect(within(item).getByText('Nadia Azzahra', { selector: 'strong' })).toBeInTheDocument();
    expect(within(item).getByText('Tinggi')).toBeInTheDocument();
    expect(screen.getByText('1 terbuka')).toBeInTheDocument();
    // Diumumkan ke pembaca layar lewat wilayah role="alert" (bukan mencuri fokus).
    expect(
      screen.getByText('Peringatan krisis baru dari Nadia Azzahra.', {
        selector: '[role="alert"]',
      }),
    ).toBeInTheDocument();
    // Rincian dan jejak audit datang dari server: halaman diminta menyegarkan data.
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('peringatan yang sudah ada dari server tidak ditampilkan dua kali', async () => {
    setup([existing]);
    await connected();
    act(() => fake.emit(insert({ id: existing.id, user_id: DIMAS, severity: 'critical' })));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('peringatan klien yang tidak dikenal tidak ditampilkan, tetapi server tetap diminta memeriksa', async () => {
    setup();
    await connected();
    act(() => fake.emit(insert({ user_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' })));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it.each([
    ['null', null],
    ['objek kosong', {}],
    ['id bukan UUID', { new: { id: 'x', user_id: DIMAS } }],
  ])('payload rusak (%s) diabaikan tanpa galat', async (_name, payload) => {
    setup();
    await connected();
    expect(() => act(() => fake.emit(payload))).not.toThrow();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('peringatan yang ditandai ditangani dari tempat lain hilang dari daftar', async () => {
    setup();
    await connected();
    act(() => fake.emit(insert()));
    await screen.findByRole('listitem');

    act(() => fake.emit({ ...insert({ status: 'resolved' }), eventType: 'UPDATE' }));
    await waitFor(() => expect(screen.queryByRole('listitem')).not.toBeInTheDocument());
  });

  it('tingkat rendah tidak pernah ditampilkan sebagai krisis', async () => {
    setup();
    await connected();
    act(() => fake.emit(insert({ severity: 'low' })));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('status koneksi mengikuti langganan dan kanal dilepas saat panel ditutup', async () => {
    const { unmount } = setup();
    await connected();

    act(() => fake.setStatus('CHANNEL_ERROR'));
    expect(
      await screen.findByText(/Koneksi langsung terputus, halaman dimuat ulang tiap 30 detik/),
    ).toBeInTheDocument();

    act(() => fake.setStatus('SUBSCRIBED'));
    expect(await connected()).toBeInTheDocument();

    unmount();
    expect(fake.removed()).toBe(1);
  });
});

describe('LiveCrisisPanel: tandai sudah ditangani', () => {
  it('mengirim id peringatan ke server dan menghapus kartunya setelah dikonfirmasi', async () => {
    acknowledge.mockResolvedValue({
      status: 'success',
      message: 'Peringatan ditandai sudah ditangani.',
    });
    const user = userEvent.setup();
    setup([existing]);
    await connected();

    await user.click(screen.getByRole('button', { name: /Tandai sudah ditangani/ }));

    await waitFor(() => expect(screen.queryByRole('listitem')).not.toBeInTheDocument());
    expect(acknowledge).toHaveBeenCalledTimes(1);
    const formData = acknowledge.mock.calls[0]![1] as FormData;
    expect(formData.get('id')).toBe(existing.id);
    expect(screen.getByText('0 terbuka')).toBeInTheDocument();
  });

  it('galat dari server ditampilkan dan kartu tetap ada', async () => {
    acknowledge.mockResolvedValue({
      status: 'error',
      message: 'Kamu tidak punya izin untuk data ini. Klien mungkin sudah mencabut aksesnya.',
    });
    const user = userEvent.setup();
    setup([existing]);
    await connected();

    await user.click(screen.getByRole('button', { name: /Tandai sudah ditangani/ }));

    expect(await screen.findByText(/Kamu tidak punya izin untuk data ini/)).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});

describe('LiveCrisisPanel: cadangan bila koneksi langsung putus', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('memuat ulang halaman tiap 30 detik selama tidak tersambung, dan berhenti saat tersambung', async () => {
    fake = createFakeRealtime('CHANNEL_ERROR');
    render(
      <LiveCrisisPanel
        alerts={[]}
        watchedClients={clients}
        today={TODAY}
        createRealtimeClient={() => fake.client}
      />,
    );
    await screen.findByText(/Koneksi langsung terputus/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => fake.setStatus('SUBSCRIBED'));
    await screen.findByText('Terhubung langsung');
    refresh.mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
