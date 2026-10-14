'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';
import { CircleNotch } from '@phosphor-icons/react/ssr';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils/cn';

type VariantOptions = VariantProps<typeof buttonVariants>;

interface CommonProps extends VariantOptions {
  /** Sedang memproses: tombol tetap fokus tetapi klik diabaikan, dan pembaca layar diberi tahu. */
  loading?: boolean;
}

type NativeButtonProps = CommonProps &
  Omit<ComponentProps<'button'>, 'href'> & { href?: undefined };
type AnchorProps = CommonProps & Omit<ComponentProps<'a'>, 'href' | 'type'> & { href: string };

export type ButtonProps = NativeButtonProps | AnchorProps;

function isAnchorProps(props: ButtonProps): props is AnchorProps {
  return props.href !== undefined;
}

/** Skema yang tidak boleh lewat router Next (tel:, mailto:, http…). */
const EXTERNAL_HREF = /^(https?:|tel:|mailto:|sms:)/i;

/**
 * Tombol atau tautan bergaya tombol. Beri `href` untuk tautan (memakai next/link bila internal).
 * `type` bawaan `button` (bukan `submit`) supaya tidak mengirim form tanpa sengaja.
 *
 * Komponen klien karena mencegat klik saat `loading` (fungsi tidak bisa dibuat di Server
 * Component). Tetap di-render ke HTML di server, jadi tidak ada kedipan saat hydrate.
 */
export function Button(props: ButtonProps) {
  return isAnchorProps(props) ? <AnchorButton {...props} /> : <NativeButton {...props} />;
}

function Spinner() {
  return <CircleNotch aria-hidden className="animate-spin motion-reduce:animate-none" />;
}

function NativeButton({
  variant,
  size,
  block,
  loading = false,
  className,
  children,
  type = 'button',
  onClick,
  disabled,
  ...rest
}: NativeButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      // Cegah submit ganda; atribut `disabled` dihindari agar fokus keyboard tidak hilang.
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      className={cn(buttonVariants({ variant, size, block }), className)}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

function AnchorButton({
  variant,
  size,
  block,
  loading = false,
  className,
  children,
  href,
  ...rest
}: AnchorProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className);
  const content = (
    <>
      {loading ? <Spinner /> : null}
      {children}
    </>
  );

  if (EXTERNAL_HREF.test(href)) {
    return (
      <a {...rest} href={href} className={classes}>
        {content}
      </a>
    );
  }
  return (
    <Link {...rest} href={href} className={classes}>
      {content}
    </Link>
  );
}
