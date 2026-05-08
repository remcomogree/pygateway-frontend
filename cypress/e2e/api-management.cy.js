describe('API Management E2E Tests', () => {
  beforeEach(() => {
    // Mock API responses
    cy.mockAPI('GET', '**/api/v1/workspaces', [
      { id: '1', name: 'default' }
    ])
    cy.mockAPI('GET', '**/api/v1/services', [
      { 
        id: '1', 
        name: 'test-service', 
        workspace: 'default',
        provider_id: '1',
        enabled: true 
      }
    ])
    cy.mockAPI('GET', '**/api/v1/routes', [])
    cy.mockAPI('GET', '**/api/v1/plugins', [])
    cy.mockAPI('GET', '**/api/v1/providers', [
      { id: '1', name: 'Test Provider', host: 'test.example.com', port: 443 }
    ])
    
    cy.visit('/api')
  })

  it('should display API management interface', () => {
    cy.contains('API Management').should('be.visible')
    
    // Check tabs are present
    cy.contains('Workspaces').should('be.visible')
    cy.contains('Services').should('be.visible')
    cy.contains('Routes').should('be.visible')
    cy.contains('Plugins').should('be.visible')
  })

  it('should switch between tabs', () => {
    // Should start on workspaces tab
    cy.get('[data-tab="workspaces"]').should('have.class', 'active')
    
    // Switch to services
    cy.contains('Services').click()
    cy.get('[data-tab="services"]').should('have.class', 'active')
    cy.contains('test-service').should('be.visible')
    
    // Switch to routes
    cy.contains('Routes').click()
    cy.get('[data-tab="routes"]').should('have.class', 'active')
  })

  it('should create a new service', () => {
    // Switch to services tab
    cy.contains('Services').click()
    
    // Click add service button
    cy.contains('Add Service').click()
    
    // Fill out service form
    cy.fillForm({
      name: 'new-service',
      workspace: 'default',
      provider_id: '1'
    })
    
    // Mock service creation
    cy.mockAPI('POST', '**/api/v1/services', { id: '2' }, 201)
    cy.mockAPI('GET', '**/api/v1/services', [
      { id: '1', name: 'test-service', workspace: 'default' },
      { id: '2', name: 'new-service', workspace: 'default' }
    ])
    
    // Submit form
    cy.get('form').submit()
    
    // Check success
    cy.contains('new-service').should('be.visible')
  })

  it('should handle service form validation', () => {
    cy.contains('Services').click()
    cy.contains('Add Service').click()
    
    // Try to submit empty form
    cy.get('form').submit()
    
    // Should show validation errors
    cy.get('input:invalid').should('exist')
  })

  it('should filter services by workspace', () => {
    // Mock multiple workspaces and services
    cy.mockAPI('GET', '**/api/v1/workspaces', [
      { id: '1', name: 'default' },
      { id: '2', name: 'staging' }
    ])
    cy.mockAPI('GET', '**/api/v1/services', [
      { id: '1', name: 'default-service', workspace: 'default' },
      { id: '2', name: 'staging-service', workspace: 'staging' }
    ])
    
    cy.reload()
    cy.contains('Services').click()
    
    // Should show all services initially
    cy.contains('default-service').should('be.visible')
    cy.contains('staging-service').should('be.visible')
    
    // Filter by workspace
    cy.get('[data-testid="workspace-filter"]').select('default')
    cy.contains('default-service').should('be.visible')
    cy.contains('staging-service').should('not.exist')
  })

  it('should handle delete operations', () => {
    cy.contains('Services').click()
    
    // Mock delete API
    cy.mockAPI('DELETE', '**/api/v1/services/1', {}, 204)
    cy.mockAPI('GET', '**/api/v1/services', [])
    
    // Click delete button
    cy.get('[data-testid="delete-service-1"]').click()
    
    // Confirm deletion
    cy.on('window:confirm', () => true)
    
    // Service should be removed
    cy.contains('test-service').should('not.exist')
  })

  it('should take Percy snapshots of different states', () => {
    // Workspaces view
    cy.percySnapshot('API Management - Workspaces')
    
    // Services view
    cy.contains('Services').click()
    cy.percySnapshot('API Management - Services')
    
    // Service form
    cy.contains('Add Service').click()
    cy.percySnapshot('API Management - Add Service Form')
  })
})
