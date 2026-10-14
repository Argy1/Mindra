import type { ComponentType } from 'react';
import {
  ArrowsClockwise,
  CalendarHeart,
  ChatsCircle,
  HandPalm,
  Leaf,
  Lifebuoy,
  MoonStars,
  Notebook,
  NotePencil,
  UsersThree,
  Wind,
} from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/Button';
import type { Recommendation, RecommendationIcon } from '@/lib/domain/assessment/recommendations';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<
  RecommendationIcon,
  ComponentType<{ weight?: 'duotone'; className?: string }>
> = {
  journal: Notebook,
  moon: MoonStars,
  repeat: ArrowsClockwise,
  breath: Wind,
  chat: ChatsCircle,
  thought: NotePencil,
  professional: CalendarHeart,
  practice: Leaf,
  support: UsersThree,
  lifebuoy: Lifebuoy,
  grounding: HandPalm,
};

/** Daftar langkah yang bisa dicoba (design/app-asesmen.html `.reco`). Ikon dekoratif; teks selalu ada. */
export function RecommendationList({
  items,
  className,
}: {
  items: readonly Recommendation[];
  className?: string;
}) {
  return (
    <ul className={cn('grid', className)}>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <li
            key={item.id}
            className="flex items-start gap-3.5 border-t border-line-soft py-3.5 first:border-t-0 first:pt-0"
          >
            <span aria-hidden className="mt-0.5 shrink-0 text-sage-600 [&>svg]:size-6">
              <Icon weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="body-m">
                <strong className="block text-fg-1">{item.title}</strong>
                {item.description}
              </p>
              {item.cta ? (
                <Button
                  className="mt-2"
                  size="sm"
                  variant={item.highlight ? 'crisis' : 'secondary'}
                  href={item.cta.href}
                >
                  {item.cta.label}
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
