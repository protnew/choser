import { z } from 'zod';

export const ColumnSchema = z.object({
    key: z.string().min(1, "Column key is required"),
    title: z.string().min(1, "Column title is required"),
    type: z.string().min(1, "Column type is required"),
    weight: z.number().optional().nullable(),
    description: z.string().optional().nullable(),
}).passthrough();

// Row validation: name required, price optional, params are objects with {value, grade}
export const RowSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional().default(''),
    price: z.union([z.string(), z.number()]).optional().nullable(),
    link: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
}).catchall(
    z.union([
        z.object({ value: z.any().optional(), grade: z.number().optional() }),
        z.string(),
        z.number(),
        z.null(),
    ])
);

export const TableSaveSchema = z.object({
    id: z.string().min(1, "Table ID is required"),
    title: z.string().min(1, "Table Title is required").max(500),
    description: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    quality_score: z.number().optional().nullable(),
    quality_details: z.any().optional().nullable(),
    columns: z.array(ColumnSchema).default([]),
    data: z.array(RowSchema).default([])
});
