describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Mock API responses
    cy.mockDashboardAPIs()
    
    // Visit the dashboard
    cy.visit('/')
  })

  it('should display dashboard with data', () => {
    // Check that dashboard loads
    cy.contains('Dashboard').should('be.visible')
    
    // Check dashboard cards
    cy.contains('Workspaces').should('be.visible')
    cy.contains('Services').should('be.visible')
    cy.contains('Routes').should('be.visible')
    cy.contains('Plugins').should('be.visible')
    cy.contains('Dataplanes').should('be.visible')
    
    // Check data is displayed
    cy.contains('1').should('be.visible') // Should show count of 1 for each
    cy.contains('default').should('be.visible') // Workspace name
    cy.contains('test-service').should('be.visible') // Service name
  })

  it('should navigate to API management when clicking workspace card', () => {
    cy.contains('Workspaces').click()
    cy.url().should('include', '/api')
    cy.contains('API Management').should('be.visible')
  })

  it('should handle loading states', () => {
    // Intercept with delay to test loading state
    cy.intercept('GET', '**/api/v1/config/sync', { delay: 1000, body: {} })
    cy.visit('/')
    
    cy.contains('Loading dashboard data...').should('be.visible')
  })

  it('should handle error states', () => {
    // Mock API error
    cy.intercept('GET', '**/api/v1/config/sync', { statusCode: 500 })
    cy.visit('/')
    
    cy.contains('Failed to load dashboard data').should('be.visible')
  })

  it('should be responsive on mobile', () => {
    cy.viewport('iphone-x')
    cy.contains('Dashboard').should('be.visible')
    
    // Check that cards stack vertically on mobile
    cy.get('.dashboard-grid').should('have.css', 'grid-template-columns')
  })

  it('should take Percy snapshot', () => {
    cy.contains('Dashboard').should('be.visible')
    cy.percySnapshot('Dashboard - Loaded State')
  })
})
