/** Sapaan/gelar yang tidak ikut dihitung sebagai inisial. */
const HONORIFICS = /^(dr|drs|dra|prof|ir|h|hj|bu|pak)\.?$/i;

/**
 * Inisial untuk avatar. Gelar di belakang koma diabaikan:
 *   "Rina Sari, M.Psi." → "RS"   ·   "Argy" → "AR"   ·   "Dr. Bagas Hadi" → "BH"
 */
export function getInitials(name: string): string {
  const withoutSuffix = name.split(',')[0] ?? '';
  const words = withoutSuffix
    .trim()
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word) && !HONORIFICS.test(word));

  const [first, second] = words;
  if (!first) return '';
  if (second) return (first.charAt(0) + second.charAt(0)).toLocaleUpperCase('id-ID');
  // Satu kata: dua HURUF pertama (tanda baca seperti ' atau - dilewati).
  return Array.from(first)
    .filter((char) => /\p{L}/u.test(char))
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('id-ID');
}
