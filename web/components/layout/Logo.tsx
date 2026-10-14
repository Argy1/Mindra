import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Tinggi 32 / 36 / 40px — sama dengan footer, sidebar, dan header landing di mockup. */
const SIZE_CLASS = { sm: 'h-8', md: 'h-9', lg: 'h-10' } as const;

/** Logo Mindra. Berkas SVG (viewBox 240×64) tidak dioptimasi ulang oleh next/image. */
export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <Image
      src="/assets/logo-mindra.svg"
      alt="Mindra"
      width={240}
      height={64}
      priority={size !== 'sm'}
      className={cn('w-auto', SIZE_CLASS[size], className)}
    />
  );
}
