import { z } from 'zod';

// ---------------------------------------------------------------------------
// Utility: Strip HTML Tags
// ---------------------------------------------------------------------------
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

// ---------------------------------------------------------------------------
// Utility: Strip Sensitive Fields (bankCode, accountNumber, ac)
// ---------------------------------------------------------------------------
export function stripSensitiveFields<
  T extends Record<string, unknown>,
>(state: T): Omit<T, 'bankCode' | 'accountNumber' | 'ac'> {
  const { bankCode, accountNumber, ac, ...safe } = state;
  return safe as Omit<T, 'bankCode' | 'accountNumber' | 'ac'>;
}

// ---------------------------------------------------------------------------
// Template FormState Schema (.strict() 拒絕敏感欄位)
// ---------------------------------------------------------------------------
export const templateFormStateSchema = z
  .object({
    mode: z.enum(['pay', 'bill']),
    title: z.string().optional(),
    amount: z.string().optional(),
    pax: z.number().optional(),
    taxRate: z.number().optional(),
    items: z
      .array(
        z.object({
          n: z.string(),
          p: z.number(),
          o: z.array(z.number()),
        }),
      )
      .optional(),
    members: z.array(z.string()).optional(),
  })
  .strict();

export type TemplateFormState = z.infer<typeof templateFormStateSchema>;

// ---------------------------------------------------------------------------
// Feedback Schema
// ---------------------------------------------------------------------------
const feedbackSchema = z.object({
  type: z.literal('feedback'),
  category: z.enum(['bug', 'suggestion', 'other']),
  description: z
    .string()
    .min(10, { message: '描述至少需要 10 個字元' })
    .max(1000, { message: '描述不可超過 1000 個字元' }),
  contact: z.string().max(100, { message: '聯絡方式不可超過 100 個字元' }).optional(),
  userAgent: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Template Schema
// ---------------------------------------------------------------------------
const templateSchema = z.object({
  type: z.literal('template'),
  authorName: z
    .string()
    .min(1, { message: '作者名稱不可為空' })
    .max(50, { message: '作者名稱不可超過 50 個字元' }),
  notes: z.string().max(500, { message: '備註不可超過 500 個字元' }).optional(),
  formState: templateFormStateSchema,
  userAgent: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Discriminated Union
// ---------------------------------------------------------------------------
export const submitSchema = z.discriminatedUnion('type', [
  feedbackSchema,
  templateSchema,
]);

export type SubmitPayload = z.infer<typeof submitSchema>;
export type FeedbackPayload = z.infer<typeof feedbackSchema>;
export type TemplatePayload = z.infer<typeof templateSchema>;
