import z from 'zod';

export interface UpdateOwnerFormValues {
  name?: string | undefined;
  contactEmail?: string | null | undefined;
  contactPhone?: string | null | undefined;
}

export const updateOwnerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(20, 'Name must be 20 characters or less')
      .optional(),
    contactEmail: z.email('Enter a valid email address').nullable().optional(),
    contactPhone: z.string().trim().min(1, 'Phone number is required').nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined || data.contactEmail !== undefined || data.contactPhone !== undefined,
    {
      error: 'At least one field must be provided',
    },
  ) satisfies z.ZodType<UpdateOwnerFormValues>;
