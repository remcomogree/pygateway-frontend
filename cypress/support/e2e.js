// Import commands.js using ES2015 syntax:
import './commands'
import '@percy/cypress'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log for cleaner output
Cypress.on('window:before:load', (win) => {
  // Stub console methods to reduce noise in tests
  cy.stub(win.console, 'log').as('consoleLog')
  cy.stub(win.console, 'warn').as('consoleWarn')
  cy.stub(win.console, 'error').as('consoleError')
})

// Add custom commands to handle API mocking
Cypress.Commands.add('mockAPI', (method, url, response, statusCode = 200) => {
  cy.intercept(method, url, {
    statusCode,
    body: response
  }).as(`api${method}${url.replace(/[^a-zA-Z0-9]/g, '')}`)
})

// Command to mock all dashboard APIs
Cypress.Commands.add('mockDashboardAPIs', () => {
  cy.mockAPI('GET', '**/api/v1/config/sync', {
    workspaces: [
      { id: '1', name: 'default' }
    ],
    services: [
      { id: '1', name: 'test-service', workspace: 'default' }
    ],
    routes: [
      { id: '1', name: 'test-route', service: 'test-service' }
    ],
    plugins: [
      { id: '1', name: 'test-plugin' }
    ]
  })
  
  cy.mockAPI('GET', '**/api/v1/dataplanes/', [
    { id: '1', name: 'dataplane-1', status: 'healthy' }
  ])
})

// Command to mock LLM providers
Cypress.Commands.add('mockLLMProviders', () => {
  cy.mockAPI('GET', '**/api/v1/llm/providers', [
    {
      id: '1',
      name: 'OpenAI Test',
      provider_type: 'openai',
      api_key: 'sk-test-key',
      base_url: 'https://api.openai.com/v1',
      enabled: true
    }
  ])
})

// Command to wait for app to be fully loaded
Cypress.Commands.add('waitForApp', () => {
  cy.get('[data-testid="app-loaded"]', { timeout: 10000 }).should('exist')
})
