/**
 * API Schema Definitions for PyGateway
 * 
 * This file contains Zod schema definitions based on the OpenAPI specification
 * from http://localhost:8001/openapi.json
 * 
 * These schemas are used to validate request and response data to ensure
 * data integrity and provide better error messages.
 */

import { z } from 'zod';

// ===========================================
// WORKSPACE SCHEMAS
// ===========================================

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  enabled: z.boolean().default(true).optional()
});

export const WorkspaceUpdateSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  enabled: z.boolean().nullable().optional()
});

export const WorkspaceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

// ===========================================
// SERVICE SCHEMAS
// ===========================================

// Helper to transform empty strings to null for nullable fields
const nullableStringField = () => z.string().transform(val => val === "" ? null : val).nullable().optional();
const nullableNumberField = () => z.number().int().positive().transform(val => val === 0 ? null : val).nullable().optional();

export const ServiceCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  workspace_id: z.string().min(1, "Workspace ID is required"),
  provider_id: nullableStringField(),
  host: nullableStringField(),
  port: nullableNumberField(),
  protocol: z.string().default("http").optional(),
  path: z.string().default("").optional(),
  connect_timeout: nullableNumberField(),
  read_timeout: z.number().int().positive().default(60000).optional(),
  write_timeout: z.number().int().positive().default(60000).optional(),
  max_request_size: nullableNumberField(),
  max_response_size: nullableNumberField(),
  streaming: z.boolean().default(false).optional(),
  websocket_enabled: z.boolean().default(false).optional(),
  request_buffer_size: z.number().int().positive().transform(val => val === 0 ? null : val).nullable().optional(),
  retries: z.number().int().min(0).default(5).optional(),
  enabled: z.boolean().default(true).optional()
});

export const ServiceUpdateSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  provider_id: nullableStringField(),
  host: nullableStringField(),
  port: nullableNumberField(),
  protocol: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  connect_timeout: nullableNumberField(),
  read_timeout: nullableNumberField(),
  write_timeout: nullableNumberField(),
  max_request_size: nullableNumberField(),
  max_response_size: nullableNumberField(),
  streaming: z.boolean().nullable().optional(),
  websocket_enabled: z.boolean().nullable().optional(),
  request_buffer_size: z.number().int().positive().transform(val => val === 0 ? null : val).nullable().optional(),
  retries: z.number().int().min(0).nullable().optional(),
  enabled: z.boolean().nullable().optional()
});

export const ServiceResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  workspace_id: z.string(),
  provider_id: z.string().nullable(),
  host: z.string().nullable(),
  port: z.number().int().nullable(),
  protocol: z.string(),
  path: z.string(),
  connect_timeout: z.number().int(),
  read_timeout: z.number().int(),
  write_timeout: z.number().int(),
  max_request_size: z.number().int().nullable(),
  max_response_size: z.number().int().nullable(),
  streaming: z.boolean(),
  websocket_enabled: z.boolean(),
  request_buffer_size: z.number().int().nullable(),
  retries: z.number().int(),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  debug_enabled: z.boolean().nullable().optional(),
  debug_expires_at: z.string().nullable().optional()
});

// ===========================================
// ROUTE SCHEMAS
// ===========================================

export const RouteCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  service_id: z.string().min(1, "Service ID is required"),
  protocols: z.array(z.string()).default(["http", "https"]).optional(),
  methods: z.array(z.string()).default(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).optional(),
  hosts: z.array(z.string()).default([]).optional(),
  paths: z.array(z.string()).default([]).optional(),
  resources: z.array(z.string()).default([]).optional(),
  strip_path: z.boolean().default(true).optional(),
  preserve_host: z.boolean().default(false).optional(),
  regex_priority: z.number().int().default(0).optional(),
  enabled: z.boolean().default(true).optional(),
  grpc_service: z.string().nullable().optional(),
  grpc_method: z.string().nullable().optional(),
  protobuf_definition: z.string().nullable().optional()
});

export const RouteUpdateSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  service_id: z.string().nullable().optional(),
  protocols: z.array(z.string()).nullable().optional(),
  methods: z.array(z.string()).nullable().optional(),
  hosts: z.array(z.string()).nullable().optional(),
  paths: z.array(z.string()).nullable().optional(),
  resources: z.array(z.string()).nullable().optional(),
  strip_path: z.boolean().nullable().optional(),
  preserve_host: z.boolean().nullable().optional(),
  regex_priority: z.number().int().nullable().optional(),
  enabled: z.boolean().nullable().optional(),
  grpc_service: z.string().nullable().optional(),
  grpc_method: z.string().nullable().optional(),
  protobuf_definition: z.string().nullable().optional()
});

export const RouteResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  service_id: z.string(),
  protocols: z.array(z.string()),
  methods: z.array(z.string()),
  hosts: z.array(z.string()),
  paths: z.array(z.string()),
  resources: z.array(z.string()),
  strip_path: z.boolean(),
  preserve_host: z.boolean(),
  regex_priority: z.number().int(),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  grpc_service: z.string().nullable().optional(),
  grpc_method: z.string().nullable().optional(),
  protobuf_definition: z.string().nullable().optional()
});

// ===========================================
// PROVIDER SCHEMAS
// ===========================================

export const ProviderCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.number().int().positive().min(1, "Port must be positive"),
  protocol: z.string().default("http").optional(),
  path: z.string().default("").optional(),
  connect_timeout: z.number().int().positive().default(60000).optional(),
  read_timeout: z.number().int().positive().default(60000).optional(),
  write_timeout: z.number().int().positive().default(60000).optional(),
  retries: z.number().int().min(0).default(5).optional(),
  enabled: z.boolean().default(true).optional()
});

export const ProviderUpdateSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  host: z.string().min(1).nullable().optional(),
  port: nullableNumberField(),
  protocol: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  connect_timeout: nullableNumberField(),
  read_timeout: nullableNumberField(),
  write_timeout: nullableNumberField(),
  retries: z.number().int().min(0).nullable().optional(),
  enabled: z.boolean().nullable().optional()
});

export const ProviderResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  port: z.number().int(),
  protocol: z.string(),
  path: z.string(),
  connect_timeout: z.number().int(),
  read_timeout: z.number().int(),
  write_timeout: z.number().int(),
  retries: z.number().int(),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

// ===========================================
// CONSUMER SCHEMAS
// ===========================================

export const ConsumerCreateSchema = z.object({
  username: z.string().min(1, "Username is required"),
  custom_id: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]).optional()
});

export const ConsumerUpdateSchema = z.object({
  username: z.string().min(1).nullable().optional(),
  custom_id: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional()
});

export const ConsumerResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  custom_id: z.string().nullable(),
  tags: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string()
});

// ===========================================
// CERTIFICATE SCHEMAS
// ===========================================

export const CertificateCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  data: z.string().min(1, "Certificate data is required"),
  enabled: z.boolean().default(true).optional()
});

export const CertificateUpdateSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  data: z.string().min(1).nullable().optional(),
  enabled: z.boolean().nullable().optional()
});

export const CertificateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  data: z.string(),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

// ===========================================
// PLUGIN SCHEMAS
// ===========================================

export const PluginCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  workspace_id: z.string().nullable().optional(),
  service_id: z.string().nullable().optional(),
  route_id: z.string().nullable().optional(),
  consumer_id: z.string().nullable().optional(),
  config: z.record(z.any()).default({}).optional(),
  enabled: z.boolean().default(true).optional(),
  priority: z.number().int().default(0).optional()
});

export const PluginUpdateSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  workspace_id: z.string().nullable().optional(),
  service_id: z.string().nullable().optional(),
  route_id: z.string().nullable().optional(),
  consumer_id: z.string().nullable().optional(),
  config: z.record(z.any()).nullable().optional(),
  enabled: z.boolean().nullable().optional(),
  priority: z.number().int().nullable().optional()
});

export const PluginResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  workspace_id: z.string().nullable(),
  service_id: z.string().nullable(),
  route_id: z.string().nullable(),
  consumer_id: z.string().nullable(),
  config: z.record(z.any()),
  enabled: z.boolean(),
  priority: z.number().int(),
  created_at: z.string(),
  updated_at: z.string()
});

// ===========================================
// MONETIZATION SCHEMAS
// ===========================================

export const PlanCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  price_per_unit: z.number().int().min(0).default(0).optional(),
  quota: z.number().int().positive().nullable().optional(),
  period: z.string().default("month").optional(),
  enabled: z.boolean().default(true).optional()
});

export const PlanUpdateSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  price_per_unit: z.number().int().min(0).nullable().optional(),
  quota: z.number().int().positive().nullable().optional(),
  period: z.string().nullable().optional(),
  enabled: z.boolean().nullable().optional()
});

export const PlanResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price_per_unit: z.number().int(),
  quota: z.number().int().nullable(),
  period: z.string(),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export const SubscriptionCreateSchema = z.object({
  consumer_id: z.string().min(1, "Consumer ID is required"),
  service_id: z.string().min(1, "Service ID is required"),
  plan_id: z.string().min(1, "Plan ID is required"),
  status: z.string().default("active").optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional()
});

export const SubscriptionUpdateSchema = z.object({
  consumer_id: z.string().nullable().optional(),
  service_id: z.string().nullable().optional(),
  plan_id: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional()
});

export const SubscriptionResponseSchema = z.object({
  id: z.string(),
  consumer_id: z.string(),
  service_id: z.string(),
  plan_id: z.string(),
  status: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

// ===========================================
// DATAPLANE SCHEMAS
// ===========================================

export const DataPlaneRegisterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ip: z.string().min(1, "IP is required"),
  port: z.number().int().positive().default(8000).optional(),
  config_version: z.string().default("0").optional()
});

export const DataPlaneResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  ip: z.string(),
  port: z.number().int(),
  status: z.enum(["online", "offline", "error"]),
  last_seen: z.string(),
  config_version: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

// ===========================================
// DEBUG SCHEMAS
// ===========================================

export const DebugEnableRequestSchema = z.object({
  enable: z.boolean()
});

export const DebugEntryResponseSchema = z.object({
  id: z.string(),
  service_id: z.string(),
  request_method: z.string(),
  request_path: z.string(),
  request_headers: z.record(z.string()),
  request_body: z.string().nullable(),
  response_status: z.number().int(),
  response_headers: z.record(z.string()),
  response_body: z.string().nullable(),
  timestamp: z.string(),
  latency_ms: z.number()
});

// ===========================================
// PAGINATION SCHEMAS
// ===========================================

export const PaginatedResponseSchema = (itemSchema) => z.object({
  items: z.array(itemSchema),
  total: z.number().int().min(0)
});

// Specific paginated response schemas
export const PaginatedWorkspaceResponseSchema = PaginatedResponseSchema(WorkspaceResponseSchema);
export const PaginatedServiceResponseSchema = PaginatedResponseSchema(ServiceResponseSchema);
export const PaginatedRouteResponseSchema = PaginatedResponseSchema(RouteResponseSchema);
export const PaginatedProviderResponseSchema = PaginatedResponseSchema(ProviderResponseSchema);
export const PaginatedConsumerResponseSchema = PaginatedResponseSchema(ConsumerResponseSchema);
export const PaginatedPluginResponseSchema = PaginatedResponseSchema(PluginResponseSchema);

// ===========================================
// ERROR SCHEMAS
// ===========================================

export const ValidationErrorSchema = z.object({
  loc: z.array(z.union([z.string(), z.number()])),
  msg: z.string(),
  type: z.string()
});

export const HTTPValidationErrorSchema = z.object({
  detail: z.array(ValidationErrorSchema).optional()
});

// ===========================================
// QUERY PARAMETER SCHEMAS
// ===========================================

export const PaginationParamsSchema = z.object({
  offset: z.number().int().min(0).default(0).optional(),
  limit: z.number().int().min(1).max(1000).default(100).optional()
});

export const WorkspaceQueryParamsSchema = PaginationParamsSchema.extend({
  enabled: z.boolean().nullable().optional()
});

export const ServiceQueryParamsSchema = PaginationParamsSchema.extend({
  workspace_id: z.string().nullable().optional()
});

export const RouteQueryParamsSchema = PaginationParamsSchema.extend({
  service_id: z.string().nullable().optional()
});

export const PluginQueryParamsSchema = PaginationParamsSchema.extend({
  service_id: z.string().nullable().optional(),
  route_id: z.string().nullable().optional(),
  enabled: z.boolean().nullable().optional()
});

export const CertificateQueryParamsSchema = PaginationParamsSchema.extend({
  enabled: z.boolean().nullable().optional()
});

// ===========================================
// SCHEMA MAP FOR EASY ACCESS
// ===========================================

export const SCHEMAS = {
  // Workspace schemas
  WorkspaceCreate: WorkspaceCreateSchema,
  WorkspaceUpdate: WorkspaceUpdateSchema,
  WorkspaceResponse: WorkspaceResponseSchema,
  
  // Service schemas
  ServiceCreate: ServiceCreateSchema,
  ServiceUpdate: ServiceUpdateSchema,
  ServiceResponse: ServiceResponseSchema,
  
  // Route schemas
  RouteCreate: RouteCreateSchema,
  RouteUpdate: RouteUpdateSchema,
  RouteResponse: RouteResponseSchema,
  
  // Provider schemas
  ProviderCreate: ProviderCreateSchema,
  ProviderUpdate: ProviderUpdateSchema,
  ProviderResponse: ProviderResponseSchema,
  
  // Consumer schemas
  ConsumerCreate: ConsumerCreateSchema,
  ConsumerUpdate: ConsumerUpdateSchema,
  ConsumerResponse: ConsumerResponseSchema,
  
  // Certificate schemas
  CertificateCreate: CertificateCreateSchema,
  CertificateUpdate: CertificateUpdateSchema,
  CertificateResponse: CertificateResponseSchema,
  
  // Plugin schemas
  PluginCreate: PluginCreateSchema,
  PluginUpdate: PluginUpdateSchema,
  PluginResponse: PluginResponseSchema,
  
  // Monetization schemas
  PlanCreate: PlanCreateSchema,
  PlanUpdate: PlanUpdateSchema,
  PlanResponse: PlanResponseSchema,
  SubscriptionCreate: SubscriptionCreateSchema,
  SubscriptionUpdate: SubscriptionUpdateSchema,
  SubscriptionResponse: SubscriptionResponseSchema,
  
  // Dataplane schemas
  DataPlaneRegister: DataPlaneRegisterSchema,
  DataPlaneResponse: DataPlaneResponseSchema,
  
  // Debug schemas
  DebugEnableRequest: DebugEnableRequestSchema,
  DebugEntryResponse: DebugEntryResponseSchema,
  
  // Pagination
  Pagination: PaginationParamsSchema,
  PaginatedWorkspaceResponse: PaginatedWorkspaceResponseSchema,
  PaginatedServiceResponse: PaginatedServiceResponseSchema,
  PaginatedRouteResponse: PaginatedRouteResponseSchema,
  PaginatedProviderResponse: PaginatedProviderResponseSchema,
  PaginatedConsumerResponse: PaginatedConsumerResponseSchema,
  PaginatedPluginResponse: PaginatedPluginResponseSchema,
  
  // Query parameters
  WorkspaceQuery: WorkspaceQueryParamsSchema,
  ServiceQuery: ServiceQueryParamsSchema,
  RouteQuery: RouteQueryParamsSchema,
  PluginQuery: PluginQueryParamsSchema,
  CertificateQuery: CertificateQueryParamsSchema
};

/**
 * Validation helper function
 * @param {Object} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @param {string} context - Context for error messages
 * @throws {Error} Validation error with detailed message
 * @returns {any} Validated and parsed data
 */
export function validateData(schema, data, context = 'data') {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error.errors) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Validation failed for ${context}: ${errorMessages}`);
    }
    throw new Error(`Validation failed for ${context}: ${error.message}`);
  }
}

/**
 * Safe validation helper that returns success/error result
 * @param {Object} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {Object} {success: boolean, data?: any, error?: string}
 */
export function safeValidateData(schema, data) {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error.errors) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: error.message };
  }
}

// ===========================================
// EXPORT ALL SCHEMAS
// ===========================================
