import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CAREGIVER_TIP_CATEGORY_LABEL, CAREGIVER_TIPS } from '@/lib/domain/caregiver/tips';

/**
 * Panduan untuk pendamping, dari satu sumber (lib/domain/caregiver/tips.ts). Tiap artikel adalah
 * <details> bawaan browser: bisa dibuka dengan keyboard tanpa JavaScript.
 */
export function CaregiverTips() {
  return (
    <section aria-labelledby="h-panduan">
      <h2 id="h-panduan" className="mb-4 h2">
        Panduan untuk pendamping
      </h2>
      <div className="grid gap-3">
        {CAREGIVER_TIPS.map((tip) => (
          <Card key={tip.id} as="article" className="p-0">
            <details className="group">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-6 py-4">
                <span className="font-semibold text-fg-1">{tip.title}</span>
                <Badge tone="sage">{CAREGIVER_TIP_CATEGORY_LABEL[tip.category]}</Badge>
                <span className="meta">{tip.readMinutes} menit baca</span>
              </summary>
              <div className="grid gap-4 px-6 pt-1 pb-6">
                {tip.sections.map((section, index) => (
                  <div key={index} className="grid gap-2">
                    {section.heading ? <h3 className="h3">{section.heading}</h3> : null}
                    {section.text ? <p className="body-m">{section.text}</p> : null}
                    {section.list ? (
                      <ul className="grid list-disc gap-1.5 pl-5 body-m">
                        {section.list.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          </Card>
        ))}
      </div>
    </section>
  );
}
