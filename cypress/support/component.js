import { mount } from 'cypress/react18'
import './commands'

Cypress.Commands.add('mount', mount)

// Example: cy.mount(<MyComponent />)
