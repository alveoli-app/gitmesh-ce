# Frontend Context: GitMesh CE

## Overview

This document provides frontend-specific architectural patterns, component design guidelines, and best practices for working with the GitMesh CE Vue 3 frontend codebase. It describes the structure, patterns, and principles without providing specific code implementations.

## Technology Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Language**: TypeScript
- **UI Library**: Element Plus
- **Styling**: Tailwind CSS
- **State Management**: Pinia (primary) + Vuex (legacy)
- **Routing**: Vue Router 4
- **Charts**: Chart.js with Chartkick
- **Rich Text**: TipTap
- **Real-Time**: Socket.io client
- **Testing**: Cypress (E2E)

## Project Structure

```
frontend/
├── src/
│   ├── modules/               # Feature modules
│   │   ├── auth/             # Authentication
│   │   ├── dashboard/        # Main dashboard
│   │   ├── signals/          # Signal management
│   │   ├── integrations/     # Integration configs
│   │   ├── member/           # Member management
│   │   ├── organization/     # Organization management
│   │   ├── activity/         # Activity tracking
│   │   ├── settings/         # User settings
│   │   └── {module}/
│   │       ├── components/   # Module-specific components
│   │       ├── pages/        # Module pages
│   │       ├── store/        # Module Pinia store
│   │       └── routes.ts     # Module routes
│   ├── shared/               # Shared components and utilities
│   │   ├── components/       # Reusable Vue components
│   │   ├── composables/      # Vue composables
│   │   ├── utils/            # Utility functions
│   │   └── types/            # TypeScript types
│   ├── store/                # Global Pinia stores
│   ├── router/               # Vue Router config
│   ├── assets/               # Static assets
│   │   └── scss/            # Global styles
│   ├── i18n/                 # Internationalization
│   ├── config.js             # App configuration
│   ├── app.vue               # Root component
│   └── main.ts               # App entry point
├── public/                    # Static files
├── index.html                # HTML template
├── vite.config.js            # Vite configuration
└── package.json
```

## Core Patterns

### 1. Composition API Pattern

Use Vue 3 Composition API for all new components:

**Composition API Structure**:
- Use script setup syntax for cleaner code
- Define props with TypeScript interfaces
- Use withDefaults for default prop values
- Define emits with TypeScript for type safety
- Declare reactive state with ref and reactive
- Use computed for derived state
- Define methods as regular functions
- Use lifecycle hooks (onMounted, onUnmounted, etc.)

**Component Organization**:
- Props definition at top
- Emits definition after props
- State declarations (ref, reactive)
- Store usage
- Computed properties
- Methods/functions
- Lifecycle hooks
- Template section
- Scoped styles

**Reactivity Principles**:
- Use ref for primitive values
- Use reactive for objects
- Access ref values with .value in script
- Refs unwrap automatically in template
- Computed values are read-only
- Watch for side effects on changes

### 2. Composables Pattern

Extract reusable logic into composables:

**Composable Principles**:
- Create composables for shared logic
- Name with "use" prefix (e.g., usePagination)
- Return reactive state and methods
- Keep composables focused on single concern
- Make composables reusable across components
- Document composable parameters and returns

**Common Composable Patterns**:
- Pagination logic
- Form handling
- API error handling
- Data fetching
- Real-time updates
- Local storage
- Window events

**Composable Structure**:
- Accept configuration parameters
- Define internal reactive state
- Create computed properties
- Define methods
- Return public API (state and methods)

### 3. Pinia Store Pattern

Define stores with Pinia for state management:

**Store Structure**:
- Use defineStore with setup function
- Define state with ref and reactive
- Create getters with computed
- Define actions as async functions
- Return public API (state, getters, actions)

**Store Organization**:
- One store per domain/module
- State: Reactive data
- Getters: Computed derived state
- Actions: Methods that modify state or call APIs

**Store Best Practices**:
- Keep stores focused on single domain
- Use descriptive store names
- Handle loading and error states
- Cache data when appropriate
- Invalidate cache on updates
- Use actions for all state mutations

### 4. Service Layer Pattern

Separate API calls into service classes:

**Service Class Structure**:
- Static methods for API operations
- Use authAxios for authenticated requests
- Return response data
- Handle HTTP methods (GET, POST, PUT, DELETE)
- Support query parameters
- Handle request/response transformation

**Service Methods**:
- list: Get collection with filters and pagination
- find: Get single resource by ID
- create: Create new resource
- update: Update existing resource
- destroy: Delete resource
- Custom methods for specific operations

**Service Principles**:
- One service per resource type
- Keep services stateless
- Handle only HTTP communication
- Let stores handle state management
- Throw errors for failed requests
- Return typed responses

### 5. Router Configuration Pattern

Define routes with lazy loading:

**Route Definition**:
- Use lazy loading for code splitting
- Define route path and name
- Specify component with dynamic import
- Add meta fields for auth and permissions
- Group related routes together

**Route Meta Fields**:
- auth: Requires authentication
- permission: Required permission
- title: Page title
- layout: Layout component to use

**Navigation Guards**:
- beforeEach: Check authentication
- beforeEach: Check permissions
- beforeEach: Set page title
- Handle redirects for unauthorized access

## Component Design Guidelines

### 1. Component Structure

Organize components by responsibility:

**Component Organization**:
- base/: Base UI components (buttons, inputs, modals)
- layout/: Layout components (header, sidebar, footer)
- feature/: Feature-specific components (cards, lists, forms)
- shared/: Shared utility components (loading, errors, empty states)

**Component Naming**:
- Use PascalCase for component files
- Use descriptive, specific names
- Prefix base components with "Base"
- Prefix app-level components with "App"
- Avoid generic names that conflict with HTML elements

### 2. Props and Events

Follow Vue 3 best practices for component communication:

**Props Definition**:
- Define props with TypeScript interfaces
- Use withDefaults for default values
- Make props readonly (don't mutate)
- Use descriptive prop names
- Document complex props

**Events Definition**:
- Define emits with TypeScript
- Use descriptive event names
- Use kebab-case for event names in template
- Pass relevant data with events
- Document event payloads

**v-model Pattern**:
- Use defineModel for two-way binding
- Support v-model for form components
- Use update:modelValue event convention

### 3. Component Naming

Follow Vue style guide conventions:

**Good Naming Examples**:
- MemberCard.vue - Specific and descriptive
- MemberListItem.vue - Clear hierarchy
- BaseButton.vue - Base component prefix
- AppHeader.vue - App-level component

**Bad Naming Examples**:
- member-card.vue - Wrong case
- memberCard.vue - Wrong case
- Card.vue - Too generic
- button.vue - Conflicts with HTML element

### 4. Scoped Styles

Use scoped styles with Tailwind CSS:

**Styling Principles**:
- Use scoped attribute on style tags
- Prefer Tailwind utility classes
- Use BEM naming for custom classes
- Apply Tailwind directives with @apply
- Keep custom CSS minimal
- Use CSS variables for theming

**Class Naming Convention**:
- Use component name as prefix
- Use double underscore for elements
- Use descriptive class names
- Keep classes semantic

### 5. Slots Pattern

Use slots for flexible composition:

**Slot Types**:
- Default slot: Main content
- Named slots: Specific sections (header, footer)
- Scoped slots: Pass data to parent

**Slot Principles**:
- Provide default content when appropriate
- Use named slots for multiple sections
- Check slot existence with $slots
- Use scoped slots to expose component data
- Document available slots

## State Management

### 1. When to Use Pinia

**Use Pinia for**:
- Shared state across multiple components
- Complex state logic
- API data caching
- Global application state
- Cross-module communication

**Don't use Pinia for**:
- Component-local state (use ref/reactive)
- Props that can be passed down
- Temporary UI state
- Form input values (unless shared)

### 2. Store Organization

**Store Naming Convention**:
- One store per domain/module
- Use descriptive names (useMemberStore, useAuthStore)
- Avoid generic names (useAppStore, useDataStore)

**Store Examples**:
- useMemberStore: Member management
- useAuthStore: Authentication state
- useSettingsStore: User settings
- useNotificationStore: Notifications

### 3. Store Composition

Compose stores when needed:

**Store Composition Principles**:
- Import and use other stores in actions
- Don't create circular dependencies
- Keep stores focused on their domain
- Use composition for cross-domain operations
- Coordinate multiple stores in components or dedicated stores

## Form Handling

### 1. Form Component Pattern

**Form Structure**:
- Use Element Plus form components
- Define form data with reactive
- Create validation rules object
- Use form ref for validation methods
- Handle submit and reset

**Form Validation**:
- Define rules for each field
- Use built-in validators (required, email, etc.)
- Create custom validators for complex rules
- Validate on blur or change
- Show validation errors inline
- Prevent submission if invalid

**Form Methods**:
- handleSubmit: Validate and emit data
- handleReset: Clear form fields
- Custom validation functions

### 2. Form Validation

Use Element Plus validation or custom validators:

**Validation Rules**:
- required: Field must have value
- type: Validate data type (email, number, etc.)
- min/max: Length or value constraints
- pattern: Regular expression matching
- validator: Custom validation function

**Custom Validators**:
- Accept rule, value, and callback
- Call callback with Error for failure
- Call callback() for success
- Perform async validation if needed
- Provide clear error messages

## API Integration

### 1. Axios Configuration

**Axios Setup**:
- Create axios instance with base URL
- Set default timeout
- Add request interceptors for auth
- Add response interceptors for errors
- Handle token refresh
- Redirect on authentication failure

**Request Interceptor**:
- Add authorization header
- Include auth token from store
- Set content type
- Add custom headers

**Response Interceptor**:
- Handle successful responses
- Catch HTTP errors
- Handle 401 (redirect to login)
- Handle 403 (show forbidden message)
- Handle network errors

### 2. Error Handling

**Error Handling Composable**:
- Create reusable error handling logic
- Store error state
- Display error messages
- Clear errors
- Use Element Plus message component

**Error Handling Principles**:
- Extract error message from response
- Provide fallback error message
- Show user-friendly messages
- Log errors for debugging
- Clear errors when appropriate

## Real-Time Updates

### 1. Socket.io Integration

**Socket Setup**:
- Initialize socket connection
- Authenticate with token
- Handle connect/disconnect events
- Reconnect automatically
- Close socket on logout

**Socket Management**:
- Create socket instance
- Store socket reference
- Provide getter function
- Handle connection lifecycle
- Clean up on disconnect

### 2. Real-Time Composable

**Real-Time Composable Pattern**:
- Create composable for socket events
- Register event listeners on mount
- Unregister on unmount
- Handle incoming events
- Update component state

**Event Handling**:
- Listen for specific events
- Update local state on events
- Sync with store if needed
- Handle multiple event types
- Clean up listeners properly

## Internationalization

### 1. i18n Setup

**Translation File Structure**:
- Organize by language code (en, es, pt-BR)
- Group translations by domain
- Use nested objects for organization
- Keep keys descriptive

**Translation Organization**:
- common: Shared translations
- module-specific: Domain translations
- Nested structure for related terms

### 2. Using Translations

**Translation Usage**:
- Import useI18n composable
- Use t() function for translations
- Pass translation key
- Support interpolation for dynamic values
- Handle pluralization
- Support different locales

## Performance Optimization

### 1. Lazy Loading

**Lazy Loading Strategies**:
- Lazy load route components
- Use dynamic imports
- Split code by route
- Reduce initial bundle size
- Load components on demand

**Component Lazy Loading**:
- Use defineAsyncComponent
- Load heavy components asynchronously
- Show loading state while loading
- Handle loading errors

### 2. Virtual Scrolling

For large lists, use virtual scrolling:

**Virtual Scrolling Benefits**:
- Render only visible items
- Improve performance for large datasets
- Reduce DOM nodes
- Smooth scrolling experience

**Virtual Scrolling Usage**:
- Use Element Plus TableV2 component
- Define columns configuration
- Provide data array
- Set fixed width and height
- Configure row height

### 3. Memoization

**Computed Properties**:
- Use computed for derived state
- Computed values are cached
- Recompute only when dependencies change
- Avoid expensive operations in templates
- Use computed for filtering and sorting

## Testing

### 1. Component Tests

**E2E Testing with Cypress**:
- Test user workflows
- Test complete features
- Interact with real UI
- Verify visual elements
- Test form submissions
- Verify navigation

**Test Structure**:
- beforeEach: Setup (login, navigate)
- Test cases: User interactions
- Assertions: Verify outcomes

**Test Best Practices**:
- Use data-testid attributes
- Test user behavior, not implementation
- Keep tests independent
- Clean up after tests
- Use realistic test data

### 2. Test Data Attributes

Add data-testid for testing:

**Test ID Principles**:
- Add to interactive elements
- Use descriptive IDs
- Keep IDs stable
- Don't change IDs frequently
- Use for Cypress selectors

## Common Pitfalls

### 1. Reactivity Loss

**Reactivity Issues**:
- Destructuring store state loses reactivity
- Assigning ref value directly loses reactivity
- Spreading reactive objects loses reactivity

**Solutions**:
- Use computed for store values
- Use storeToRefs from Pinia
- Access ref.value in script
- Keep reactive objects intact

### 2. Memory Leaks

**Memory Leak Sources**:
- Event listeners not cleaned up
- Timers not cleared
- Subscriptions not unsubscribed
- DOM references not released

**Prevention**:
- Clean up in onUnmounted
- Remove event listeners
- Clear intervals and timeouts
- Unsubscribe from observables
- Release DOM references

### 3. Prop Mutation

**Prop Mutation Problem**:
- Props are readonly
- Mutating props causes warnings
- Breaks one-way data flow
- Makes debugging difficult

**Solutions**:
- Emit events to parent
- Use v-model for two-way binding
- Create local copy if needed
- Let parent manage state

## Debugging Tips

### 1. Vue Devtools

Install Vue Devtools browser extension for:

**Devtools Features**:
- Component inspection
- Component hierarchy
- Props and data inspection
- Pinia store inspection
- Store state and actions
- Event tracking
- Performance profiling
- Timeline recording

### 2. Console Logging

**Development Logging**:
- Use console.log for debugging
- Only log in development mode
- Check import.meta.env.DEV
- Remove logs before production
- Use structured logging

### 3. Error Boundaries

**Error Handling**:
- Use onErrorCaptured lifecycle hook
- Catch component errors
- Log error details
- Prevent error propagation
- Show error UI to user
- Report errors to monitoring service

## Additional Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Element Plus Documentation](https://element-plus.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Cypress Documentation](https://docs.cypress.io/)
