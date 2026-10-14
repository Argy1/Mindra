import type { z } from 'zod';
import type { instrumentCatalogSchema } from '@/lib/api/schemas';
import { INSTRUMENT_LIST } from '@/lib/domain/assessment/instruments';
import { maxScoreFor } from '@/lib/domain/assessment/scoring';

export type InstrumentCatalog = z.infer<typeof instrumentCatalogSchema>;

/** Katalog instrumen untuk `GET /api/v1/instruments`: sumber yang sama dengan halaman skrining web. */
export function instrumentCatalog(): InstrumentCatalog {
  return INSTRUMENT_LIST.map((instrument) => ({
    id: instrument.id,
    name: instrument.name,
    title: instrument.title,
    description: instrument.description,
    duration: instrument.duration,
    lead: instrument.lead,
    maxScore: maxScoreFor(instrument.id),
    questions: instrument.questions.map((question) => ({
      id: question.id,
      order: question.order,
      text: question.text,
      reverseScored: question.reverseScored,
      options: question.options.map((option) => ({ label: option.label, value: option.value })),
    })),
  }));
}
