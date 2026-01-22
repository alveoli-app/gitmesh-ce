/**
 * Chunk Availability E2E Tests
 * 
 * Tests page reload behavior and chunk availability in the browser.
 * Monitors for 404 errors during loading and dynamic imports.
 * 
 * Requirements: 4.2, 4.3 - Page reload behavior and chunk availability
 */

describe('Chunk Availability Tests', () => {
  let networkErrors = [];
  let chunkErrors = [];

  beforeEach(() => {
    // Reset error tracking
    networkErrors = [];
    chunkErrors = [];

    // Intercept network requests to monitor for 404s
    cy.intercept('**/*.js', (req) => {
      req.continue((res) => {
        if (res.statusCode === 404) {
          networkErrors.push({
            url: req.url,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    // Monitor console for chunk loading errors
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((message) => {
        if (typeof message === 'string' && 
            (message.includes('chunk') || message.includes('404') || message.includes('Failed to fetch'))) {
          chunkErrors.push({
            message: message.toString(),
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  });

  it('should load the application without chunk 404 errors', () => {
    cy.visit('/', { timeout: 30000 });
    
    // Wait for application to fully load
    cy.get('body', { timeout: 15000 }).should('be.visible');
    
    // Check for network errors
    cy.then(() => {
      expect(networkErrors, `Network 404 errors detected: ${JSON.stringify(networkErrors)}`).to.have.length(0);
    });
    
    // Check for console chunk errors
    cy.then(() => {
      expect(chunkErrors, `Console chunk errors detected: ${JSON.stringify(chunkErrors)}`).to.have.length(0);
    });
  });

  it('should handle page reloads without chunk errors', () => {
    cy.visit('/', { timeout: 30000 });
    cy.get('body', { timeout: 15000 }).should('be.visible');
    
    // Clear previous errors
    networkErrors = [];
    chunkErrors = [];
    
    // Perform page reload
    cy.reload();
    cy.get('body', { timeout: 15000 }).should('be.visible');
    
    // Check for errors after reload
    cy.then(() => {
      expect(networkErrors, `Network 404 errors after reload: ${JSON.stringify(networkErrors)}`).to.have.length(0);
      expect(chunkErrors, `Console chunk errors after reload: ${JSON.stringify(chunkErrors)}`).to.have.length(0);
    });
  });

  it('should handle multiple page reloads without accumulating errors', () => {
    cy.visit('/', { timeout: 30000 });
    cy.get('body', { timeout: 15000 }).should('be.visible');
    
    // Perform multiple reloads
    for (let i = 0; i < 3; i++) {
      // Clear errors before each reload
      networkErrors = [];
      chunkErrors = [];
      
      cy.reload();
      cy.get('body', { timeout: 15000 }).should('be.visible');
      
      // Check for errors after each reload
      cy.then(() => {
        expect(networkErrors, `Network 404 errors on reload ${i + 1}: ${JSON.stringify(networkErrors)}`).to.have.length(0);
        expect(chunkErrors, `Console chunk errors on reload ${i + 1}: ${JSON.stringify(chunkErrors)}`).to.have.length(0);
      });
    }
  });

  it('should load Element Plus components without chunk errors', () => {
    cy.visit('/', { timeout: 30000 });
    cy.get('body', { timeout: 15000 }).should('be.visible');
    
    // Clear previous errors
    networkErrors = [];
    chunkErrors = [];
    
    // Try to trigger Element Plus component loading by interacting with UI
    // This will depend on the actual application structure
    cy.get('body').then(($body) => {
      // Look for common Element Plus components
      const elementPlusSelectors = [
        '.el-button',
        '.el-input',
        '.el-form',
        '.el-dialog',
        '.el-table',
        '.el-menu',
        '.el-dropdown'
      ];
      
      elementPlusSelectors.forEach(selector => {
        if ($body.find(selector).length > 0) {
          cy.get(selector).first().should('be.visible');
        }
      });
    });
    
    // Wait a bit for any dynamic imports to complete
    cy.wait(2000);
    
    // Check for chunk errors related to Element Plus
    cy.then(() => {
      const elementPlusErrors = networkErrors.filter(error => 
        error.url.includes('element-plus') || error.url.includes('ElementPlus')
      );
      expect(elementPlusErrors, `Element Plus chunk 404 errors: ${JSON.stringify(elementPlusErrors)}`).to.have.length(0);
      
      const elementPlusConsoleErrors = chunkErrors.filter(error =>
        error.message.includes('element-plus') || error.message.includes('ElementPlus')
      );
      expect(elementPlusConsoleErrors, `Element Plus console errors: ${JSON.stringify(elementPlusConsoleErrors)}`).to.have.length(0);
    });
  });

  it('should handle navigation without chunk loading failures', () => {
    cy.visit('/', { timeout: 30000 });
    cy.get('body', { timeout: 15000 }).should('be.visible');
    
    // Clear previous errors
    networkErrors = [];
    chunkErrors = [];
    
    // Try to navigate to different routes if they exist
    cy.get('body').then(($body) => {
      // Look for navigation elements
      const navSelectors = [
        'a[href]',
        '.router-link',
        '[data-cy="nav"]',
        'nav a'
      ];
      
      let foundNavigation = false;
      
      navSelectors.forEach(selector => {
        if (!foundNavigation && $body.find(selector).length > 0) {
          const $links = $body.find(selector);
          if ($links.length > 0) {
            const href = $links.first().attr('href');
            if (href && href.startsWith('/') && href !== '/') {
              cy.get(selector).first().click();
              cy.wait(2000); // Wait for navigation
              foundNavigation = true;
            }
          }
        }
      });
      
      if (!foundNavigation) {
        // If no navigation found, just wait and check current page
        cy.wait(1000);
      }
    });
    
    // Check for navigation-related chunk errors
    cy.then(() => {
      expect(networkErrors, `Navigation chunk 404 errors: ${JSON.stringify(networkErrors)}`).to.have.length(0);
      expect(chunkErrors, `Navigation console errors: ${JSON.stringify(chunkErrors)}`).to.have.length(0);
    });
  });

  it('should maintain chunk availability after browser refresh', () => {
    cy.visit('/', { timeout: 30000 });
    cy.get('body', { timeout: 15000 }).should('be.visible');
    
    // Get initial page state
    cy.url().then(initialUrl => {
      // Clear errors
      networkErrors = [];
      chunkErrors = [];
      
      // Perform browser refresh (different from cy.reload())
      cy.window().then(win => win.location.reload());
      cy.get('body', { timeout: 15000 }).should('be.visible');
      
      // Verify we're still on the same page
      cy.url().should('eq', initialUrl);
      
      // Check for errors after refresh
      cy.then(() => {
        expect(networkErrors, `Network 404 errors after refresh: ${JSON.stringify(networkErrors)}`).to.have.length(0);
        expect(chunkErrors, `Console chunk errors after refresh: ${JSON.stringify(chunkErrors)}`).to.have.length(0);
      });
    });
  });

  afterEach(() => {
    // Log any errors found for debugging
    if (networkErrors.length > 0) {
      cy.log('Network errors detected:', JSON.stringify(networkErrors, null, 2));
    }
    
    if (chunkErrors.length > 0) {
      cy.log('Console errors detected:', JSON.stringify(chunkErrors, null, 2));
    }
  });
});