/**
 * Nama perangkat TOTP yang tampil di halaman Keamanan akun. Memakai zona WIB (bukan UTC), supaya jamnya sama dengan
 * yang dilihat pemilik akun di ponselnya: "Perangkat 16 Okt 2026, 00.24 WIB". Fungsi murni: waktu diberikan pemanggil.
 */
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function totpDeviceName(now: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    PARTS.formatToParts(now).find((item) => item.type === type)?.value ?? '';
  const month = MONTHS_SHORT[Number(part('month')) - 1] ?? '';
  return `Perangkat ${Number(part('day'))} ${month} ${part('year')}, ${part('hour')}.${part('minute')} WIB`;
}
