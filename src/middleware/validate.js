/**
 * Zod validation schemas for API + MCP inputs
 */
import { z } from 'zod'

// ─── Council schemas ───

export const councilDecideSchema = z.object({
  topic: z.string().min(1).max(500),
  alternatives: z.array(z.string().min(1).max(200)).min(2).max(10),
  criteria: z.array(z.object({
    name: z.string().min(1).max(100),
    weight: z.number().min(1).max(100).optional()
  })).max(20).optional(),
  persona_list: z.array(z.string().max(50)).max(6).optional()
})

export const createTableSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  columns: z.array(z.any()).max(30).optional(),
  rows: z.array(z.any()).max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional()
})

export const getTableSchema = z.object({
  id: z.string().min(1).max(100)
})

export const listTablesSchema = z.object({
  q: z.string().max(200).optional(),
  tag: z.string().max(50).optional(),
  cursor: z.string().max(50).optional(),
  limit: z.number().int().min(1).max(200).optional()
})

export const explainTableSchema = z.object({
  id: z.string().min(1).max(100)
})

export const suggestSimilarSchema = z.object({
  query: z.string().min(1).max(200)
})

// ─── Auth schemas ───

export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200)
})

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  ttl_days: z.number().int().min(1).max(365).optional()
})

// ─── Validation helper ───

export function validate(schema) {
  return (data) => {
    const result = schema.safeParse(data)
    if (!result.success) {
      const errors = result.error.issues?.map(i => `${i.path.join('.')}: ${i.message}`) || ['Validation failed']
      return { ok: false, errors }
    }
    return { ok: true, data: result.data }
  }
}
