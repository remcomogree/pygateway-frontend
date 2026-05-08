import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/test-utils'
import userEvent from '@testing-library/user-event'
import APIView from '../APIView'
import { createMockResponse } from '../../test/helpers'
import api from '../../api/PyGatewayAPI.js'

describe('APIView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.requestCache.clear()
    api.responseCacheMap.clear()
    global.fetch = vi.fn()
  })

  it('should render API management title', async () => {
    // Mock all API calls that happen on mount - use proper backend format
    const mockWorkspaces = { items: [], total: 0 }
    const mockServices = { items: [], total: 0 }
    const mockRoutes = { items: [], total: 0 }
    const mockProviders = { items: [], total: 0 }
    const mockPlugins = { items: [], total: 0 }

    global.fetch = vi.fn()
      .mockResolvedValueOnce(createMockResponse(mockWorkspaces)) // loadWorkspaces
      .mockResolvedValueOnce(createMockResponse(mockWorkspaces)) // loadWorkspaces again for providers view
      .mockResolvedValueOnce(createMockResponse(mockServices))   // loadServices
      .mockResolvedValueOnce(createMockResponse(mockRoutes))     // loadRoutes
      .mockResolvedValueOnce(createMockResponse(mockProviders))  // loadProviders
      .mockResolvedValueOnce(createMockResponse(mockPlugins))    // loadPlugins

    render(<APIView />)
    
    expect(screen.getByText('API Management')).toBeInTheDocument()
  })

  it('should switch tabs correctly', async () => {
    const user = userEvent.setup()
    
    // Mock all API calls with proper backend format
    const mockWorkspaces = { items: [], total: 0 }
    const mockServices = { items: [], total: 0 }
    const mockRoutes = { items: [], total: 0 }
    const mockProviders = { items: [], total: 0 }
    const mockPlugins = { items: [], total: 0 }

    global.fetch = vi.fn()
      .mockResolvedValueOnce(createMockResponse(mockWorkspaces))
      .mockResolvedValueOnce(createMockResponse(mockWorkspaces))
      .mockResolvedValueOnce(createMockResponse(mockServices))
      .mockResolvedValueOnce(createMockResponse(mockRoutes))
      .mockResolvedValueOnce(createMockResponse(mockProviders))
      .mockResolvedValueOnce(createMockResponse(mockPlugins))

    render(<APIView />)

    const workspacesTab = screen.getByRole('link', { name: /Workspaces/ })
    const servicesTab = screen.getByRole('link', { name: /Services/ })

    // Click workspaces tab first to ensure known state
    await user.click(workspacesTab)
    await waitFor(() => {
      expect(workspacesTab).toHaveClass('active')
    })

    // Click services tab to test switching
    await user.click(servicesTab)
    await waitFor(() => {
      expect(servicesTab).toHaveClass('active')
    })
  })

  it('should show loading states', () => {
    // Mock API calls to be pending
    global.fetch = vi.fn(() => new Promise(() => {}))
    
    render(<APIView />)
    
    expect(screen.getByText('Loading API data...')).toBeInTheDocument()
  })

  it('should display API statistics', async () => {
    // Mock API calls with proper backend format containing totals
    const mockWorkspaces = { items: [{ id: 1 }], total: 1 }
    const mockServices = { items: [{ id: 1 }, { id: 2 }], total: 2 }
    const mockRoutes = { items: [{ id: 1 }, { id: 2 }, { id: 3 }], total: 3 }
    const mockProviders = { items: [{ id: 1 }], total: 1 }
    const mockPlugins = { items: [{ id: 1 }, { id: 2 }], total: 2 }
    const mockAbacPolicies = { items: [], total: 0 }
    const mockAbacStatus = { enabled: false }

    global.fetch = vi.fn().mockImplementation((url) => {
      const u = typeof url === 'string' ? url : url.toString()
      if (u.includes('/workspaces')) return Promise.resolve(createMockResponse(mockWorkspaces))
      if (u.includes('/services')) return Promise.resolve(createMockResponse(mockServices))
      if (u.includes('/routes')) return Promise.resolve(createMockResponse(mockRoutes))
      if (u.includes('/providers')) return Promise.resolve(createMockResponse(mockProviders))
      if (u.includes('/plugins')) return Promise.resolve(createMockResponse(mockPlugins))
      if (u.includes('/abac') && u.includes('/status')) return Promise.resolve(createMockResponse(mockAbacStatus))
      if (u.includes('/abac')) return Promise.resolve(createMockResponse(mockAbacPolicies))
      return Promise.resolve(createMockResponse({ items: [], total: 0 }))
    })

    render(<APIView />)

    await waitFor(() => {
      // Check that the API statistics section exists and has correct data
      expect(screen.getByText('API Management')).toBeInTheDocument()
      const statsSection = screen.getByText('API Management').closest('.page-header')
      expect(statsSection).toBeInTheDocument()
      expect(statsSection.textContent).toContain('1')
      expect(statsSection.textContent).toContain('Workspaces')
      expect(statsSection.textContent).toContain('2')
      expect(statsSection.textContent).toContain('Services')
      expect(statsSection.textContent).toContain('3')
      expect(statsSection.textContent).toContain('Routes')
      expect(statsSection.textContent).toContain('2')
      expect(statsSection.textContent).toContain('Plugins')
    })
  })

  it('should handle API errors gracefully', async () => {
    // Mock API calls to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

    render(<APIView />)

    // Should render despite API errors
    await waitFor(() => {
      expect(screen.getByText('API Management')).toBeInTheDocument()
      const statsSection = screen.getByText('API Management').closest('.page-header')
      expect(statsSection).toBeInTheDocument()
      expect(statsSection.textContent).toContain('0')
      expect(statsSection.textContent).toContain('Workspaces')
      expect(statsSection.textContent).toContain('0')
      expect(statsSection.textContent).toContain('Services')
      expect(statsSection.textContent).toContain('0')
      expect(statsSection.textContent).toContain('Routes')
      expect(statsSection.textContent).toContain('0')
      expect(statsSection.textContent).toContain('Plugins')
    })
  })

  it('should render all navigation tabs', async () => {
    // Mock all API calls with proper backend format
    const mockWorkspaces = { items: [], total: 0 }
    const mockServices = { items: [], total: 0 }
    const mockRoutes = { items: [], total: 0 }
    const mockProviders = { items: [], total: 0 }
    const mockPlugins = { items: [], total: 0 }

    global.fetch = vi.fn()
      .mockResolvedValueOnce(createMockResponse(mockWorkspaces))
      .mockResolvedValueOnce(createMockResponse(mockWorkspaces))
      .mockResolvedValueOnce(createMockResponse(mockServices))
      .mockResolvedValueOnce(createMockResponse(mockRoutes))
      .mockResolvedValueOnce(createMockResponse(mockProviders))
      .mockResolvedValueOnce(createMockResponse(mockPlugins))

    render(<APIView />)

    // Check all tabs are rendered using role-based selectors
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Workspaces/ })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Services/ })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Routes/ })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Plugins/ })).toBeInTheDocument()
    })
  })
})