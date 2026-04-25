import { z } from 'zod';

export const configSchema = z.object({
  provider: z.string().optional().describe('models.dev provider id'),
  includes: z.array(z.string()).optional(),
  models: z
    .record(
      z.string(),
      z
        .string()
        .meta({ $ref: 'https://models.dev/model-schema.json#/$defs/Model' }),
    )
    .optional(),
});

export type Config = z.output<typeof configSchema>;

export const optionsSchema = z.record(
  z.string(),
  z.union([z.string(), configSchema]),
);
