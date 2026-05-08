import { vi } from 'vitest'
import { render } from '@testing-library/react'

export const createMockResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
  headers: new Headers({ 'content-type': 'application/json' }),
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
})

export const mockFetch = (response) => {
  global.fetch = vi.fn().mockResolvedValue(response)
}

export const mockFetchError = (error = new Error('Network error')) => {
  global.fetch = vi.fn().mockRejectedValue(error)
}

export const createMockUser = () => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin'
})

export const createMockProvider = () => ({
  id: '1',
  name: 'Test Provider',
  host: 'test.example.com',
  port: 443,
  enabled: true
})

export const createMockService = () => ({
  id: '1',
  name: 'test-service',
  workspace: 'default',
  provider_id: '1',
  enabled: true,
  connect_timeout: 5000,
  streaming: false,
  max_request_size: 1048576,
  max_response_size: 1048576
})

export const createMockWorkspace = () => ({
  id: '1',
  name: 'default',
  services: [createMockService()]
})

export const renderWithRouter = (component, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route)
  return render(component)
}
