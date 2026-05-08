describe('LLM Management E2E Tests', () => {
  beforeEach(() => {
    cy.mockLLMProviders()
    cy.mockAPI('GET', '**/api/v1/llm/templates', [])
    cy.mockAPI('GET', '**/api/v1/llm/tools', [])
    cy.mockAPI('GET', '**/api/v1/llm/security/policies', [])
    cy.mockAPI('GET', '**/api/v1/llm/billing', {
      current_month_cost: 150.50,
      previous_month_cost: 120.30,
      total_cost: 2500.75,
      current_month_requests: 1500,
      previous_month_requests: 1200,
      total_requests: 25000
    })
    
    cy.visit('/llm')
  })

  it('should display LLM management interface', () => {
    cy.contains('LLM Management').should('be.visible')
    
    // Check tabs
    cy.contains('Providers').should('be.visible')
    cy.contains('Templates').should('be.visible')
    cy.contains('Security').should('be.visible')
    cy.contains('Billing').should('be.visible')
    cy.contains('Tools').should('be.visible')
  })

  it('should show LLM providers', () => {
    cy.contains('OpenAI Test').should('be.visible')
    cy.contains('openai').should('be.visible')
    cy.contains('Test').should('be.visible')
    cy.contains('Edit').should('be.visible')
    cy.contains('Delete').should('be.visible')
  })

  it('should create new LLM provider', () => {
    cy.contains('Add Provider').click()
    
    // Fill provider form
    cy.fillForm({
      name: 'Anthropic Test',
      provider_type: 'anthropic',
      api_key: 'sk-ant-test-key',
      base_url: 'https://api.anthropic.com'
    })
    
    // Mock creation
    cy.mockAPI('POST', '**/api/v1/llm/providers', { id: '2' }, 201)
    cy.mockAPI('GET', '**/api/v1/llm/providers', [
      {
        id: '1',
        name: 'OpenAI Test',
        provider_type: 'openai'
      },
      {
        id: '2',
        name: 'Anthropic Test',
        provider_type: 'anthropic'
      }
    ])
    
    cy.contains('Save Provider').click()
    cy.contains('Anthropic Test').should('be.visible')
  })

  it('should test LLM provider', () => {
    cy.mockAPI('POST', '**/api/v1/llm/providers/1/test', { status: 'healthy' })
    
    cy.get('[data-testid="test-provider-1"]').click()
    
    cy.waitForAPI('apiPOSTapiv1llmproviderstest')
    // Should show success message or indicator
  })

  it('should navigate between LLM tabs', () => {
    // Templates tab
    cy.contains('Templates').click()
    cy.contains('Add Template').should('be.visible')
    
    // Security tab
    cy.contains('Security').click()
    cy.contains('Add Policy').should('be.visible')
    
    // Billing tab
    cy.contains('Billing').click()
    cy.contains('$150.50').should('be.visible') // Current month cost
    
    // Tools tab
    cy.contains('Tools').click()
    cy.contains('Register Tool').should('be.visible')
  })

  it('should create LLM template', () => {
    cy.contains('Templates').click()
    cy.contains('Add Template').click()
    
    cy.fillForm({
      name: 'Test Template',
      system_prompt: 'You are a helpful assistant',
      user_prompt_template: 'Answer: {question}'
    })
    
    cy.mockAPI('POST', '**/api/v1/llm/templates', { id: '1' }, 201)
    cy.mockAPI('GET', '**/api/v1/llm/templates', [
      {
        id: '1',
        name: 'Test Template',
        system_prompt: 'You are a helpful assistant'
      }
    ])
    
    cy.contains('Save Template').click()
    cy.contains('Test Template').should('be.visible')
  })

  it('should handle billing display', () => {
    cy.contains('Billing').click()
    
    cy.contains('Current Month').should('be.visible')
    cy.contains('$150.50').should('be.visible')
    cy.contains('Previous Month').should('be.visible')
    cy.contains('$120.30').should('be.visible')
    cy.contains('Total Spent').should('be.visible')
    cy.contains('$2,500.75').should('be.visible')
  })

  it('should register new tool', () => {
    cy.contains('Tools').click()
    cy.contains('Register Tool').click()
    
    cy.fillForm({
      name: 'Test Tool',
      category: 'utility',
      endpoint: 'https://api.example.com/tool',
      description: 'A test tool'
    })
    
    cy.mockAPI('POST', '**/api/v1/llm/tools', { id: '1' }, 201)
    cy.mockAPI('GET', '**/api/v1/llm/tools', [
      {
        id: '1',
        name: 'Test Tool',
        category: 'utility',
        endpoint: 'https://api.example.com/tool'
      }
    ])
    
    cy.contains('Save Tool').click()
    cy.contains('Test Tool').should('be.visible')
  })

  it('should take Percy snapshots', () => {
    // Providers view
    cy.percySnapshot('LLM Management - Providers')
    
    // Templates view
    cy.contains('Templates').click()
    cy.percySnapshot('LLM Management - Templates')
    
    // Security view
    cy.contains('Security').click()
    cy.percySnapshot('LLM Management - Security')
    
    // Billing view
    cy.contains('Billing').click()
    cy.percySnapshot('LLM Management - Billing')
    
    // Tools view
    cy.contains('Tools').click()
    cy.percySnapshot('LLM Management - Tools')
  })

  it('should work on mobile devices', () => {
    cy.viewport('iphone-x')
    
    cy.contains('LLM Management').should('be.visible')
    cy.contains('Providers').click()
    cy.contains('OpenAI Test').should('be.visible')
    
    // Test mobile navigation
    cy.get('.tabs').should('be.visible')
  })
})
