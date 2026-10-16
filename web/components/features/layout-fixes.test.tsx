import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaregiverDetailView } from '@/components/features/caregiver/CaregiverDetailView';
import { SlotPicker } from '@/components/features/consultation/SlotPicker';
import { InviteCaregiver } from '@/components/features/privacy/InviteCaregiver';
import { ConnectPsychologist } from '@/components/features/privacy/ConnectPsychologist';
import { Sidebar } from '@/components/layout/Sidebar';
import { SHELL_NAV } from '@/components/layout/nav-config';
import { Input } from '@/components/ui/Input';
import { PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';
import type { CaregiverPatientDetail } from '@/lib/server/caregiver';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/lib/consultation/actions', () => ({ bookConsultationAction: vi.fn() }));
vi.mock('@/lib/privacy/actions', () => ({
  inviteCaregiverAction: vi.fn(),
  connectPsychologistAction: vi.fn(),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

beforeEach(() => vi.clearAllMocks());

describe('#9 sidebar: nama panjang tidak memunculkan scroll horizontal', () => {
  it('sidebar menyembunyikan luapan mendatar; nama dan peran terpotong (truncate) dengan title penuh', () => {
    render(
      <Sidebar
        nav={SHELL_NAV.facility_admin}
        currentPath="/faskes"
        user={{
          name: 'Administrator Dinas Kesehatan Kota Bogor Bidang Pelayanan Kesehatan Masyarakat',
          roleLabel: 'Admin fasilitas kesehatan tingkat kota dan kabupaten',
        }}
      />,
    );
    const aside = screen.getByRole('complementary', { name: 'Bilah samping' });
    expect(aside.className).toContain('overflow-x-hidden');
    const name = within(aside).getByText(/Administrator Dinas Kesehatan/);
    expect(name.className).toContain('truncate');
    expect(name).toHaveAttribute('title', name.textContent);
    expect(name.parentElement?.className).toContain('min-w-0');
    expect(within(aside).getByText(/Admin fasilitas kesehatan tingkat/).className).toContain(
      'truncate',
    );
  });
});

describe('#17 area klik <summary> selebar kotak', () => {
  it.each([
    ['Undang pendamping', () => render(<InviteCaregiver />)],
    ['Hubungkan psikolog', () => render(<ConnectPsychologist options={[]} />)],
  ])('%s: summary berupa flex selebar penuh, bukan inline', (label, mount) => {
    mount();
    const summary = screen.getByText(label).closest('summary');
    expect(summary).not.toBeNull();
    expect(summary!.className).toMatch(/(^|\s)flex(\s|$)/);
    expect(summary!.className).toContain('w-full');
    expect(summary!.className).not.toContain('inline-flex');
  });
});

describe('#18 kolom hanya-baca tampak dan terbaca berbeda', () => {
  it('readOnly: aria-readonly dikirim eksplisit dan ada gaya redup', () => {
    render(<Input label="Email" value="a@b.co" readOnly onChange={() => {}} />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveAttribute('aria-readonly', 'true');
    expect(input.className).toContain('aria-readonly:bg-sunken');
    expect(input.className).toContain('aria-readonly:cursor-default');
  });

  it('kolom biasa tidak diberi aria-readonly', () => {
    render(<Input label="Nama" />);
    expect(screen.getByLabelText('Nama')).not.toHaveAttribute('aria-readonly');
  });
});

describe('#15 SlotPicker: tidak ada titik ganda setelah gelar', () => {
  const day = (date: string, slots: { hour: number; state: 'available' | 'taken' }[]) => ({
    date,
    slots: slots.map(({ hour, state }) => ({
      startsAt: `${date}T${String(hour).padStart(2, '0')}:00:00+07:00`,
      label: `${String(hour).padStart(2, '0')}.00`,
      state,
    })),
  });

  it('nama yang berakhir "M.Psi." lalu tarif: tidak muncul ".." dan nama berdiri sendiri', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(
      <SlotPicker
        psychologistId="p1"
        psychologistName="Dr. Rina Sari, M.Psi."
        fee={150000}
        days={[day('2026-10-15', [{ hour: 9, state: 'available' }])]}
      />,
    );
    await userEvent.click(screen.getByLabelText('09.00'));
    expect(screen.getByText('Dengan Dr. Rina Sari, M.Psi.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('..');
    expect(screen.getByText(/Tarif per sesi Rp/)).toBeInTheDocument();
  });
});

describe('#16 SlotPicker: libur dan penuh dibedakan', () => {
  it('hari tanpa slot = libur; hari dengan semua slot dipesan = penuh; hari dengan slot = jumlah jam', () => {
    render(
      <SlotPicker
        psychologistId="p1"
        psychologistName="Dr. Rina Sari"
        fee={100000}
        days={[
          {
            date: '2026-10-15',
            slots: [
              { startsAt: '2026-10-15T09:00:00+07:00', label: '09.00', state: 'available' },
              { startsAt: '2026-10-15T10:00:00+07:00', label: '10.00', state: 'available' },
            ],
          },
          {
            date: '2026-10-16',
            slots: [{ startsAt: '2026-10-16T09:00:00+07:00', label: '09.00', state: 'taken' }],
          },
          { date: '2026-10-17', slots: [] },
        ]}
      />,
    );
    const group = screen.getByRole('group', { name: 'Daftar hari' });
    expect(within(group).getByText('2 jam')).toBeInTheDocument();
    expect(within(group).getByText('penuh')).toBeInTheDocument();
    expect(within(group).getByText('libur')).toBeInTheDocument();
  });
});

describe('#14 banner pendamping: tombol menelepon layanan krisis, bukan orang yang didampingi', () => {
  const detail = (hasAlert: boolean): CaregiverPatientDetail =>
    ({
      patient: { id: 'x', name: 'Argy Demo' },
      view: {
        alerts: hasAlert
          ? {
              allowed: true,
              open: [{ id: 'a1', severity: 'high', createdAt: '2026-10-15T10:00:00Z' }],
            }
          : { allowed: true, open: [] },
        mood: { allowed: false },
        assessment: { allowed: false },
      },
    }) as unknown as CaregiverPatientDetail;

  it('menyebut layanan yang ditelepon tombol, lengkap dengan nomornya, dan bahwa itu bukan nomor Argy Demo', () => {
    render(<CaregiverDetailView detail={detail(true)} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/Hubungi Argy Demo sekarang/);
    expect(alert).toHaveTextContent(
      `Tombol di bawah menelepon ${PRIMARY_CRISIS_RESOURCE.name} (${PRIMARY_CRISIS_RESOURCE.displayNumber})`,
    );
    expect(alert).toHaveTextContent('bukan menghubungi Argy Demo');
    expect(alert).not.toHaveTextContent(/24 jam/);
    expect(within(alert).getByRole('link', { name: /Hubungi/ })).toHaveAttribute(
      'href',
      PRIMARY_CRISIS_RESOURCE.telHref,
    );
  });

  it('tanpa peringatan terbuka tidak ada banner', () => {
    render(<CaregiverDetailView detail={detail(false)} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
