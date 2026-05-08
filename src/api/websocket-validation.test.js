import { describe, it, expect } from 'vitest';
import { ServiceCreateSchema, ServiceUpdateSchema, ServiceResponseSchema } from './schemas.js';

describe('WebSocket and Streaming API Schemas', () => {
  describe('ServiceCreateSchema', () => {
    it('should accept websocket_enabled boolean field', () => {
      const validData = {
        name: 'test-service',
        workspace_id: 'ws-123',
        websocket_enabled: true,
        host: 'example.com',
        port: 8080,
        protocol: 'http'
      };
      const result = ServiceCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept request_buffer_size numeric field', () => {
      const validData = {
        name: 'test-service',
        workspace_id: 'ws-123',
        request_buffer_size: 1048576,
        host: 'example.com',
        port: 8080,
        protocol: 'http'
      };
      const result = ServiceCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept both new fields together', () => {
      const validData = {
        name: 'ws-service',
        workspace_id: 'ws-123',
        websocket_enabled: true,
        request_buffer_size: 5242880,
        streaming: true,
        host: 'echo.example.com',
        port: 8080,
        protocol: 'http'
      };
      const result = ServiceCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow null request_buffer_size', () => {
      const validData = {
        name: 'test-service',
        workspace_id: 'ws-123',
        request_buffer_size: null,
        host: 'example.com',
        port: 8080,
        protocol: 'http'
      };
      const result = ServiceCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should work without new fields (backward compatibility)', () => {
      const validData = {
        name: 'test-service',
        workspace_id: 'ws-123',
        host: 'example.com',
        port: 8080,
        protocol: 'http'
      };
      const result = ServiceCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.websocket_enabled).toBe(false);
      expect(result.data.request_buffer_size).toBeUndefined();
    });
  });

  describe('ServiceUpdateSchema', () => {
    it('should accept websocket_enabled in updates', () => {
      const validData = {
        websocket_enabled: true
      };
      const result = ServiceUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept request_buffer_size in updates', () => {
      const validData = {
        request_buffer_size: 2097152
      };
      const result = ServiceUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow updating to null request_buffer_size', () => {
      const validData = {
        request_buffer_size: null
      };
      const result = ServiceUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('ServiceResponseSchema', () => {
    it('should include websocket_enabled in response', () => {
      const validData = {
        id: 'svc-123',
        name: 'test-service',
        workspace_id: 'ws-123',
        provider_id: null,
        host: 'example.com',
        port: 8080,
        protocol: 'http',
        path: '',
        connect_timeout: 60000,
        read_timeout: 60000,
        write_timeout: 60000,
        max_request_size: 1048576,
        max_response_size: 1048576,
        streaming: false,
        websocket_enabled: true,
        request_buffer_size: null,
        retries: 5,
        enabled: true,
        created_at: '2025-03-10T00:00:00Z',
        updated_at: '2025-03-10T00:00:00Z'
      };
      const result = ServiceResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.websocket_enabled).toBe(true);
    });

    it('should include request_buffer_size in response', () => {
      const validData = {
        id: 'svc-123',
        name: 'test-service',
        workspace_id: 'ws-123',
        provider_id: null,
        host: 'example.com',
        port: 8080,
        protocol: 'http',
        path: '',
        connect_timeout: 60000,
        read_timeout: 60000,
        write_timeout: 60000,
        max_request_size: 1048576,
        max_response_size: 1048576,
        streaming: false,
        websocket_enabled: false,
        request_buffer_size: 1048576,
        retries: 5,
        enabled: true,
        created_at: '2025-03-10T00:00:00Z',
        updated_at: '2025-03-10T00:00:00Z'
      };
      const result = ServiceResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.request_buffer_size).toBe(1048576);
    });

    it('should handle null request_buffer_size in response', () => {
      const validData = {
        id: 'svc-123',
        name: 'test-service',
        workspace_id: 'ws-123',
        provider_id: null,
        host: 'example.com',
        port: 8080,
        protocol: 'http',
        path: '',
        connect_timeout: 60000,
        read_timeout: 60000,
        write_timeout: 60000,
        max_request_size: 1048576,
        max_response_size: 1048576,
        streaming: false,
        websocket_enabled: true,
        request_buffer_size: null,
        retries: 5,
        enabled: true,
        created_at: '2025-03-10T00:00:00Z',
        updated_at: '2025-03-10T00:00:00Z'
      };
      const result = ServiceResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.request_buffer_size).toBeNull();
    });
  });
});
