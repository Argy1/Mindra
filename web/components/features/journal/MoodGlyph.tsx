import Image from 'next/image';
import { moodGlyphSrc, type MoodType } from '@/lib/domain/journal/mood';
import { cn } from '@/lib/utils/cn';

/**
 * Kerikil perasaan (public/assets/mood). Dekoratif (`alt=""`): nama perasaan SELALU ditulis sebagai
 * teks di sebelahnya, jadi warna/gambar tidak pernah menjadi satu-satunya pembawa makna.
 */
export function MoodGlyph({ mood, className }: { mood: MoodType; className?: string }) {
  return (
    <Image
      src={moodGlyphSrc(mood)}
      alt=""
      width={44}
      height={44}
      unoptimized
      className={cn('h-auto w-11', className)}
    />
  );
}
