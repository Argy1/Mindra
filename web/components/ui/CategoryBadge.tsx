import { Badge } from '@/components/ui/Badge';
import { CATEGORY_LABEL, type AssessmentCategory } from '@/lib/domain/assessment/category';

interface CategoryBadgeProps {
  category: AssessmentCategory;
  className?: string;
}

/** Lencana kategori skrining: Minimal · Ringan · Sedang · Berat. */
export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <Badge tone={category} className={className}>
      {CATEGORY_LABEL[category]}
    </Badge>
  );
}
