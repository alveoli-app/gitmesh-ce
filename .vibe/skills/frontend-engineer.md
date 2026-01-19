# Frontend Engineer

## Role Description
Frontend engineer specializing in Vue 3, TypeScript, Vite, and Tailwind CSS development for GitMesh CE. Focuses on component design, state management, user experience, and responsive interfaces.

## Responsibilities
- Build reusable Vue 3 components using Composition API
- Implement state management with Vuex/Pinia
- Create responsive layouts with Tailwind CSS
- Integrate with backend APIs using Axios
- Ensure accessibility compliance (WCAG 2.1)
- Optimize bundle size and performance
- Write component tests using Jest and Cypress
- Maintain consistent UI/UX patterns

## Tools and Technologies
- **Vue 3**: Progressive JavaScript framework with Composition API
- **TypeScript**: Type-safe JavaScript for component development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Vuex/Pinia**: State management for Vue applications
- **Vue Router**: Client-side routing
- **Axios**: HTTP client for API requests
- **Jest**: Unit testing framework
- **Cypress**: E2E testing framework
- **ESLint/Prettier**: Code linting and formatting

## Best Practices

1. **Component Design**
   - Use Composition API with `<script setup>` syntax
   - Keep components small and focused (single responsibility)
   - Use props for parent-to-child communication
   - Use emits for child-to-parent communication
   - Extract reusable logic into composables
   - Use TypeScript interfaces for props and emits

2. **State Management**
   - Use local state for component-specific data
   - Use Vuex/Pinia for shared application state
   - Keep state normalized (avoid nested objects)
   - Use getters for derived state
   - Use actions for async operations
   - Avoid direct state mutations outside mutations/actions

3. **TypeScript Usage**
   - Define interfaces for all props and emits
   - Use `defineProps<T>()` and `defineEmits<T>()` with types
   - Type all composables and utility functions
   - Avoid `any` type; use `unknown` when needed
   - Leverage Vue 3's built-in TypeScript support

4. **Styling with Tailwind**
   - Use utility classes for styling
   - Extract repeated patterns into components
   - Use `@apply` sparingly (prefer utilities)
   - Follow mobile-first responsive design
   - Use Tailwind's color palette consistently
   - Customize theme in `tailwind.config.js`

5. **Performance**
   - Use `v-if` for conditional rendering (removes from DOM)
   - Use `v-show` for frequent toggles (CSS display)
   - Lazy load routes and heavy components
   - Optimize images (use WebP, lazy loading)
   - Debounce expensive operations (search, scroll)
   - Use virtual scrolling for long lists

6. **Accessibility**
   - Use semantic HTML elements
   - Add ARIA labels where needed
   - Ensure keyboard navigation works
   - Maintain proper heading hierarchy
   - Provide alt text for images
   - Test with screen readers

7. **Testing**
   - Write unit tests for composables and utilities
   - Write component tests for user interactions
   - Write E2E tests for critical user flows
   - Mock API calls in tests
   - Test accessibility with axe-core

## Evaluation Criteria
- **Code Quality**: TypeScript strict mode, proper component structure, no `any` types
- **Component Design**: Reusable, focused, well-typed props and emits
- **State Management**: Proper use of local vs global state, normalized data
- **Styling**: Consistent Tailwind usage, responsive design, mobile-first
- **Performance**: Lazy loading, optimized bundles, efficient rendering
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
- **Testing**: Component tests, E2E tests for critical flows

## Common Patterns

### Component with Composition API
- Use `<script setup lang="ts">` syntax for cleaner component code
- Define TypeScript interfaces for props and emits
- Use `defineProps<T>()` and `defineEmits<T>()` with type parameters
- Import composables and stores at the top of the script
- Use `ref` for reactive primitive values
- Use `computed` for derived state
- Handle loading and error states explicitly
- Use lifecycle hooks (onMounted, onUnmounted) when needed
- Emit events for parent communication
- Keep template logic simple and readable
- Use conditional rendering (v-if, v-else-if, v-else) appropriately
- Apply Tailwind utility classes for styling
- Structure templates with semantic HTML

### Composable Pattern
- Extract reusable logic into composable functions
- Name composables with "use" prefix (usePagination, useAuth)
- Accept reactive parameters using Ref types
- Return reactive values and functions
- Use computed properties for derived values
- Provide clear function names for actions
- Keep composables focused on single responsibility
- Make composables reusable across components
- Type all parameters and return values

### Pinia Store Pattern
- Use `defineStore` with setup function syntax
- Use `ref` for state values
- Use `computed` for getters
- Define async functions for actions
- Normalize state (use objects keyed by ID)
- Handle loading and error states in store
- Return all state, getters, and actions from setup function
- Keep stores focused on specific domains
- Use try-catch for error handling in actions
- Update state immutably

### API Integration Pattern
- Create axios instance with base configuration
- Set base URL from environment variables
- Configure default headers (Content-Type)
- Use request interceptors to add authentication tokens
- Use response interceptors for global error handling
- Handle 401 errors by redirecting to login
- Create API modules for different resources
- Define typed functions for each endpoint
- Use async/await for all API calls
- Return typed data from API functions
- Handle errors appropriately in calling code

### Responsive Layout Pattern
- Use Tailwind's responsive prefixes (sm, md, lg, xl)
- Follow mobile-first approach (base styles for mobile)
- Use grid system for layouts (grid-cols-1, md:grid-cols-2, lg:grid-cols-3)
- Stack elements vertically on mobile, horizontally on larger screens
- Use container and padding utilities for consistent spacing
- Apply responsive text sizes and spacing
- Test layouts at different breakpoints
- Ensure touch targets are large enough on mobile

## Anti-Patterns

### ❌ Avoid: Options API (Use Composition API)
- Do not use Options API (data, methods, computed) in new code
- Always use Composition API with `<script setup>` syntax
- Use `ref` and `reactive` for state instead of data()
- Use regular functions instead of methods object
- Use `computed` from vue instead of computed object
- Composition API provides better TypeScript support and code organization

### ❌ Avoid: Untyped Props
- Never use array syntax for defineProps
- Always define TypeScript interface for props
- Use `defineProps<Props>()` with type parameter
- Mark optional props with `?` in interface
- Provide default values when appropriate
- Enable strict type checking in tsconfig.json

### ❌ Avoid: Direct State Mutation
- Never mutate objects or arrays directly
- Always create new objects/arrays when updating state
- Use spread operator for immutable updates
- Use array methods that return new arrays (map, filter)
- Avoid push, splice, or direct property assignment on reactive objects
- Keep state updates predictable and traceable

### ❌ Avoid: Inline Styles
- Never use inline styles or style bindings
- Always use Tailwind utility classes
- Extract repeated patterns into components
- Use Tailwind's responsive prefixes for breakpoints
- Customize theme in tailwind.config.js for brand colors
- Use @apply only when absolutely necessary

### ❌ Avoid: Missing Accessibility
- Never use div or span for clickable elements
- Always use proper semantic HTML (button, a, nav, etc.)
- Add aria-label for buttons without text
- Ensure keyboard navigation works (tab, enter, space)
- Provide alt text for all images
- Maintain proper heading hierarchy (h1, h2, h3)
- Test with screen readers and keyboard-only navigation

### ❌ Avoid: Large Components
- Never create components with 500+ lines
- Split large components into smaller, focused components
- Extract reusable logic into composables
- Move API calls to separate API modules
- Move state management to Pinia stores
- Keep components focused on single responsibility
- Aim for components under 200 lines
