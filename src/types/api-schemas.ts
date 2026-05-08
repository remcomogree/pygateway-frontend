/**
 * API Schema Definitions for PyGateway Frontend
 * 
 * TypeScript types and Zod schemas for better type safety
 * and runtime validation of API data structures.
 */

import { z } from 'zod';

// ===========================================
// COMMON UTILITY SCHEMAS
// ===========================================

const emptyStringToNull = z.preprocess((val) => {
  if (typeof val === 'string' && val.trim() === '') return null;
  return val;
}, z.string().nullable());

const optionalPositiveNumber = z.preprocess((val) => {
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}, z.number().positive().optional());

// ===========================================
// PAGINATION SCHEMAS
// ===========================================

export const PaginationSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(1000).default(50),
  total: z.number().int().min(0).default(0),
  hasMore: z.boolean().default(false)
});

export type Pagination = z.infer<typeof PaginationSchema>;

// ===========================================
// WORKSPACE SCHEMAS
// ===========================================

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: emptyStringToNull.optional(),
  enabled: z.boolean().default(true)
});

export const WorkspaceUpdateSchema = WorkspaceCreateSchema.partial();

export const WorkspaceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  service_count: z.number().int().min(0).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type WorkspaceCreate = z.infer<typeof WorkspaceCreateSchema>;
export type WorkspaceUpdate = z.infer<typeof WorkspaceUpdateSchema>;
export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

// ===========================================
// SERVICE SCHEMAS
// ===========================================

export const ServiceCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  workspace_id: z.string().uuid("Invalid workspace ID"),
  provider_id: emptyStringToNull.optional(),
  host: z.string().min(1, "Host is required").max(255, "Host too long"),
  port: z.preprocess(
    (val) => val === '' ? 80 : Number(val), 
    z.number().int().min(1).max(65535, "Port must be between 1 and 65535")
  ),
  path: z.string().max(1000, "Path too long").default("/"),
  protocol: z.enum(["http", "https"]).default("https"),
  enabled: z.boolean().default(true),
  description: emptyStringToNull.optional(),
  debug_enabled: z.boolean().default(false)
});

export const ServiceUpdateSchema = ServiceCreateSchema.partial();

export const ServiceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  workspace_id: z.string().uuid(),
  provider_id: z.string().nullable(),
  host: z.string(),
  port: z.number().int(),
  path: z.string(),
  protocol: z.enum(["http", "https"]),
  enabled: z.boolean(),
  description: z.string().nullable(),
  debug_enabled: z.boolean(),
  route_count: z.number().int().min(0).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type ServiceCreate = z.infer<typeof ServiceCreateSchema>;
export type ServiceUpdate = z.infer<typeof ServiceUpdateSchema>;
export type ServiceResponse = z.infer<typeof ServiceResponseSchema>;

// ===========================================
// ===========================================
// API RESPONSE WRAPPERS
// ===========================================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  pagination: PaginationSchema.optional()
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  pagination: PaginationSchema
});

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: Pagination;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: Pagination;
};

// ===========================================
// ERROR SCHEMAS
// ===========================================

export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional()
});

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(ValidationErrorSchema).optional(),
  timestamp: z.string().datetime().optional()
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
