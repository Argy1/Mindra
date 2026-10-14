import { Lifebuoy, Phone } from '@phosphor-icons/react/ssr';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { crisisCallLabel, PRIMARY_CRISIS_RESOURCE } from '@/lib/domain/crisis/resources';

/** Pita bantuan darurat di atas footer landing (design/landing.html `.crisis-band`). */
export function CrisisBand() {
  return (
    <aside aria-label="Bantuan darurat" className="border-t border-danger-100 bg-danger-50">
      <Container className="flex flex-wrap items-center gap-5 py-7">
        <Lifebuoy aria-hidden weight="duotone" className="size-8 text-danger-500" />
        <p className="min-w-0 flex-[1_1_20rem] font-medium text-danger-900">
          Kalau kamu sedang dalam bahaya atau berpikir untuk menyakiti diri, jangan tunggu. Ada yang
          siap mendengar {PRIMARY_CRISIS_RESOURCE.availability}.
        </p>
        <Button variant="crisis" href={PRIMARY_CRISIS_RESOURCE.telHref}>
          <Phone aria-hidden />
          {crisisCallLabel()}
        </Button>
      </Container>
    </aside>
  );
}
