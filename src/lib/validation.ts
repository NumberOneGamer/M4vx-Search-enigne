import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const searchSchema = z.object({
  q: z.string().min(1, 'Query is required').max(500),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(['all', 'web', 'news', 'images', 'videos', 'ai']).default('all'),
  language: z.string().max(10).optional(),
  fileType: z.string().max(50).optional(),
  site: z.string().max(500).optional(),
  sort: z.enum(['relevance', 'date']).default('relevance'),
  excludeTerms: z.string().optional(),
  dateAfter: z.string().optional(),
  dateBefore: z.string().optional(),
  datePreset: z.enum(['today', 'week', 'month']).optional(),
  exactPhrases: z.string().optional(),
});

export const suggestionSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const crawlRequestSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(100),
  depth: z.number().int().min(0).max(5).default(2),
  priority: z.number().int().min(0).max(10).default(5),
});

export const domainSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255),
  authorityScore: z.number().min(0).max(10).default(1),
  crawlRate: z.number().int().min(1).max(60).default(1),
});

export const settingsSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.string().min(1),
  description: z.string().max(500).optional(),
  category: z.string().max(100).default('general'),
});

export const analyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});
