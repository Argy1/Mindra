import { SAMPLE_NOW } from '@/app/dev/_data/fase4';
import type { PsychologistCard } from '@/lib/domain/consultation/directory';
import type { SessionItem } from '@/lib/domain/consultation/sessions';
import { generateSlots, type BookedRange, type ScheduleRow } from '@/lib/domain/consultation/slots';
import type { ScheduleItem } from '@/lib/domain/psychologist/schedule';

/**
 * Data contoh pratinjau konsultasi dan jadwal psikolog (/dev/konsultasi, /dev/konsultasi-detail, /dev/jadwal).
 * 100% sintetis. "Sekarang" = SAMPLE_NOW (Rabu 14 Okt 2026, 10.00 WIB).
 */
export { SAMPLE_NOW };

export const SAMPLE_PSYCHOLOGISTS: PsychologistCard[] = [
  {
    id: '00000000-0000-4000-8000-0000b5100000',
    name: 'Rina Sari',
    title: 'M.Psi., Psikolog',
    specializations: ['Kecemasan', 'Depresi', 'Stres akademik'],
    languages: ['id', 'en'],
    bio: 'Mendampingi mahasiswa dan pekerja muda yang kewalahan oleh tuntutan studi dan pekerjaan. Pendekatan hangat, berbasis CBT, dengan ruang yang aman untuk bercerita pelan-pelan.',
    photoUrl: null,
    rating: 4.9,
    reviews: 82,
    fee: 175000,
    verified: true,
    availableNow: true,
  },
  {
    id: '00000000-0000-4000-8000-0000b5100001',
    name: 'Budi Hartono',
    title: 'M.Psi., Psikolog',
    specializations: ['Stres kerja', 'Hubungan'],
    languages: ['id'],
    bio: 'Berpengalaman mendampingi pekerja kantoran dan pasangan muda.',
    photoUrl: null,
    rating: 4.6,
    reviews: 41,
    fee: 150000,
    verified: true,
    availableNow: false,
  },
  {
    id: '00000000-0000-4000-8000-0000b5100002',
    name: 'Ayu Lestari',
    title: 'S.Psi., M.Sc.',
    specializations: ['Remaja', 'Kecemasan'],
    languages: ['id', 'su'],
    bio: null,
    photoUrl: null,
    rating: 0,
    reviews: 0,
    fee: 0,
    verified: false,
    availableNow: false,
  },
];

const SCHEDULE: ScheduleRow[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  start: '09:00:00',
  end: '16:00:00',
}));

const BOOKED: BookedRange[] = [
  { scheduledAt: '2026-10-15T10:00:00+07:00', durationMinutes: 50 },
  { scheduledAt: '2026-10-15T13:00:00+07:00', durationMinutes: 50 },
  { scheduledAt: '2026-10-16T09:00:00+07:00', durationMinutes: 50 },
  { scheduledAt: '2026-10-16T10:00:00+07:00', durationMinutes: 50 },
];

export const sampleDays = () => generateSlots(SCHEDULE, BOOKED, SAMPLE_NOW, 14);

export const SAMPLE_SESSIONS: SessionItem[] = [
  {
    id: 's1',
    psychologistId: SAMPLE_PSYCHOLOGISTS[0]!.id,
    psychologistName: 'Rina Sari',
    scheduledAt: '2026-10-15T10:00:00+07:00',
    durationMinutes: 50,
    status: 'confirmed',
    fee: 175000,
  },
  {
    id: 's2',
    psychologistId: SAMPLE_PSYCHOLOGISTS[1]!.id,
    psychologistName: 'Budi Hartono',
    scheduledAt: '2026-10-19T14:00:00+07:00',
    durationMinutes: 50,
    status: 'pending',
    fee: 150000,
  },
  {
    id: 's3',
    psychologistId: SAMPLE_PSYCHOLOGISTS[0]!.id,
    psychologistName: 'Rina Sari',
    scheduledAt: '2026-10-06T10:00:00+07:00',
    durationMinutes: 50,
    status: 'completed',
    fee: 175000,
  },
  {
    id: 's4',
    psychologistId: SAMPLE_PSYCHOLOGISTS[1]!.id,
    psychologistName: 'Budi Hartono',
    scheduledAt: '2026-10-08T15:00:00+07:00',
    durationMinutes: 50,
    status: 'cancelled',
    fee: 150000,
  },
];

export const SAMPLE_SCHEDULE: ScheduleItem[] = [
  {
    id: 'j1',
    scheduledAt: '2026-10-14T13:00:00+07:00',
    durationMinutes: 50,
    status: 'confirmed',
    clientName: 'Argy Fadillah',
  },
  {
    id: 'j2',
    scheduledAt: '2026-10-15T10:00:00+07:00',
    durationMinutes: 50,
    status: 'confirmed',
    clientName: null,
  },
  {
    id: 'j3',
    scheduledAt: '2026-10-15T13:00:00+07:00',
    durationMinutes: 50,
    status: 'pending',
    clientName: 'Dewi Lestari',
  },
  {
    id: 'j4',
    scheduledAt: '2026-10-19T09:00:00+07:00',
    durationMinutes: 50,
    status: 'confirmed',
    clientName: null,
  },
  {
    id: 'j5',
    scheduledAt: '2026-10-13T10:00:00+07:00',
    durationMinutes: 50,
    status: 'completed',
    clientName: 'Argy Fadillah',
  },
];
