// Custom commands for Cypress

Cypress.Commands.add('login', (username = 'admin', password = 'admin') => {
  // Mock login if authentication is implemented
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-token')
    win.localStorage.setItem('user', JSON.stringify({
      id: '1',
      username,
      role: 'admin'
    }))
  })
})

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.clear()
  })
})

// Command to check if element is visible in viewport
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  cy.wrap(subject).should('be.visible')
  cy.window().then((win) => {
    const { documentElement } = win.document
    const bottom = documentElement.clientHeight
    const right = documentElement.clientWidth
    const rect = subject[0].getBoundingClientRect()
    
    expect(rect.top).to.be.at.least(0)
    expect(rect.left).to.be.at.least(0)
    expect(rect.bottom).to.be.at.most(bottom)
    expect(rect.right).to.be.at.most(right)
  })
})

// Command to fill form fields
Cypress.Commands.add('fillForm', (formData) => {
  Object.entries(formData).forEach(([field, value]) => {
    if (typeof value === 'boolean') {
      if (value) {
        cy.get(`[name="${field}"]`).check()
      } else {
        cy.get(`[name="${field}"]`).uncheck()
      }
    } else {
      cy.get(`[name="${field}"]`).clear().type(value)
    }
  })
})

// Command to wait for API request to complete
Cypress.Commands.add('waitForAPI', (alias) => {
  cy.wait(`@${alias}`).then((interception) => {
    expect(interception.response.statusCode).to.be.oneOf([200, 201, 204])
  })
})
