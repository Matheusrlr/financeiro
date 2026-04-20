import { z } from "zod";

export const extractionResponseSchema = z.object({
  reference_month: z.string().regex(/^\d{4}-\d{2}$/),
  transactions: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      description: z.string().min(1),
      amount: z.number().positive(),
    })
  ),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;

export const categorizationResponseSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int().min(0),
      category: z.enum(["necessario", "superfluo", "investimento"]),
    })
  ),
});

export type CategorizationResponse = z.infer<
  typeof categorizationResponseSchema
>;

export const consultingResponseSchema = z.object({
  summary: z.string(),
  month_over_month: z.array(
    z.object({
      metric: z.string(),
      direction: z.enum(["up", "down", "flat"]),
      comment: z.string(),
    })
  ),
  leaks: z.array(z.string()),
  tips: z.array(z.string()),
});

export type ConsultingResponse = z.infer<typeof consultingResponseSchema>;
