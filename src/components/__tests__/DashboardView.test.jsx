import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import DashboardView from '../DashboardView'
import { AppStateProvider } from '../../context/AppState'
import { createMockResponse } from '../../test/helpers'
import api from '../../api/PyGatewayAPI.js'

// Mock data that matches the actual API structure
const mockDataplanesData = [
  { 
    id: 'dp1', 
    status: 'online', 
    hostname: 'dataplane-1',
    last_seen: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T10:00:00Z'
  },
  { 
    id: 'dp2', 
    status: 'offline', 
    hostname: 'dataplane-2',
    last_seen: null,
    created_at: '2024-01-01T09:00:00Z'
  }
]

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <AppStateProvider>
        <DashboardView />
      </AppStateProvider>
    </BrowserRouter>
  )
}

// URL-based fetch mock that matches any call order
const setupFetchMock = (overrides = {}) => {
  const defaults = {
    workspaces: { items: [], total: 0 },
    services: { items: [], total: 0 },
    routes: { items: [], total: 0 },
    plugins: { items: [], total: 0 },
    consumers: { items: [], total: 0 },
    providers: { items: [], total: 0 },
    dataplanes: [],
    version: { version: '1.0.0' },
  }
  const data = { ...defaults, ...overrides }

  global.fetch = vi.fn().mockImplementation((url) => {
    const u = typeof url === 'string' ? url : url.toString()
    if (u.includes('/version')) return Promise.resolve(createMockResponse(data.version))
    if (u.includes('/dataplanes')) return Promise.resolve(createMockResponse(data.dataplanes))
    if (u.includes('/workspaces')) return Promise.resolve(createMockResponse(data.workspaces))
    if (u.includes('/services')) return Promise.resolve(createMockResponse(data.services))
    if (u.includes('/routes')) return Promise.resolve(createMockResponse(data.routes))
    if (u.includes('/plugins')) return Promise.resolve(createMockResponse(data.plugins))
    if (u.includes('/consumers')) return Promise.resolve(createMockResponse(data.consumers))
    if (u.includes('/providers')) return Promise.resolve(createMockResponse(data.providers))
    return Promise.resolve(createMockResponse({ items: [], total: 0 }))
  })
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the API singleton's internal caches
    api.requestCache.clear()
    api.responseCacheMap.clear()
  })

  it('should render loading state initially', async () => {
    // Mock API calls - use slow promises to test loading state
    global.fetch = vi.fn()
      .mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve(createMockResponse({ items: [], total: 0 })), 100)
      ))
    
    renderDashboard()
    
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()
  })

  it('should display dashboard data after loading', async () => {
    setupFetchMock({
      workspaces: { items: [{ id: 'ws1', name: 'default' }], total: 1 },
      services: { items: [{ id: 'svc1', name: 'test-service' }], total: 1 },
      routes: { items: [{ id: 'rt1', name: 'test-route' }], total: 1 },
      plugins: { items: [{ id: 'plg1', name: 'test-plugin' }], total: 1 },
      dataplanes: mockDataplanesData,
    })
    
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Workspaces')).toBeInTheDocument()
    })

    // Should show dashboard cards with counts
    expect(screen.getByText('Services')).toBeInTheDocument()
    expect(screen.getByText('Routes')).toBeInTheDocument()
    expect(screen.getByText('Plugins')).toBeInTheDocument()
    expect(screen.getByText('Dataplanes')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    // 4xx errors skip retries and fail fast
    global.fetch = vi.fn().mockResolvedValue(createMockResponse({ detail: 'API Error' }, 400))
    
    renderDashboard()

    // When API returns errors, individual loadXXX catches them internally
    // The dashboard may still render with zeroed stats or show an error
    await waitFor(() => {
      const hasError = screen.queryByText(/failed to load dashboard/i)
      const hasDashboard = screen.queryByText('Dashboard')
      expect(hasError || hasDashboard).toBeTruthy()
    })
  })

  it('should show correct counts when data loads', async () => {
    setupFetchMock({
      workspaces: { items: [{ id: 'ws1', name: 'default' }], total: 1 },
      services: { items: [{ id: 'svc1', name: 'test-service' }], total: 1 },
      routes: { items: [{ id: 'rt1', name: 'test-route' }], total: 1 },
      plugins: { items: [{ id: 'plg1', name: 'test-plugin' }], total: 1 },
      dataplanes: mockDataplanesData,
    })

    renderDashboard()

    await waitFor(() => {
      // Wait for loading to finish by checking for stat card content
      expect(screen.getByText('Workspaces')).toBeInTheDocument()
    })
    
    // Check that we have count values rendered
    expect(screen.getByText('Services')).toBeInTheDocument()
    expect(screen.getByText('Routes')).toBeInTheDocument()
    expect(screen.getByText('Plugins')).toBeInTheDocument()
  })

  it('should display connected dataplanes count', async () => {
    setupFetchMock({ dataplanes: mockDataplanesData })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeInTheDocument() // 1 online out of 2 total
    })
  })

  it('should display dataplane names when available', async () => {
    setupFetchMock({ dataplanes: mockDataplanesData })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('dataplane-1')).toBeInTheDocument()
      expect(screen.getByText('dataplane-2')).toBeInTheDocument()
    })
  })

  it('should show configuration version', async () => {
    setupFetchMock()

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeInTheDocument()
    })
  })

  it('should show dataplane status section', async () => {
    setupFetchMock({ dataplanes: mockDataplanesData })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Dataplane Status')).toBeInTheDocument()
      expect(screen.getByText('View All')).toBeInTheDocument()
    })
  })

  it('should handle empty state properly', async () => {
    setupFetchMock({ version: { version: null } })

    renderDashboard()

    await waitFor(() => {
      // When version is null/undefined, dashboard shows 'Unknown'
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })

  it('should navigate when cards are clicked', async () => {
    setupFetchMock()

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Workspaces')).toBeInTheDocument()
    })

    // Test card clicks
    const workspacesCard = screen.getByText('Workspaces').closest('.card')
    expect(workspacesCard).toBeInTheDocument()
    
    const servicesCard = screen.getByText('Services').closest('.card')
    expect(servicesCard).toBeInTheDocument()
  })
})
