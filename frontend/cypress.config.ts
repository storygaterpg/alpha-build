// ==== cypress.config.ts ==== 
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts'
  }
})

// ==== cypress/support/e2e.ts ==== 
// Import commands or configure global behavior
import '@testing-library/cypress/add-commands'

// ==== cypress/e2e/game_flow.cy.ts ==== 
/// <reference types="cypress" />

describe('StoryGate MVP Flow', () => {
  it('allows a player to join, chat, and move', () => {
    // Visit home and enter name
    cy.visit('/')
    cy.get('input[placeholder="Enter your player name"]').type('TestPlayer')
    cy.contains('Connect to Game').click()

    // Should navigate to /game
    cy.url().should('include', '/game')
    // Wait for WebSocket connection
    cy.contains('Online')

    // Chat functionality
    cy.get('.chat-panel input').type('Hello DM{enter}')
    cy.get('.chat-panel .messages').should('contain', 'TestPlayer:')
    cy.get('.chat-panel .messages').should('contain', 'DM:')

    // ActionBar: click Move and then on map
    cy.contains('Move').click()
    // Map tile should accept click - pick center of map
    cy.get('.phaser-container').click('center')
    // Log panel should show move logs
    cy.get('.log-panel').should('not.be.empty')
  })
})

// ==== .github/workflows/ci.yml ==== 
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Dependencies
        run: npm ci
      - name: Run Lint
        run: npm run lint || echo "No lint script configured"
      - name: Run Type Check
        run: npm run build -- --dry-run
      - name: Run Jest Tests
        run: npm test
      - name: Start Dev Server
        run: npm run dev &
      - name: Run Cypress Tests
        uses: cypress-io/github-action@v5
        with:
          start: npm run dev
          wait-on: 'http://localhost:3000'
          browser: chrome
