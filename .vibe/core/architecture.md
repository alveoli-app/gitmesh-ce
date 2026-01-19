# GitMesh CE Architecture

## System Overview

GitMesh Community Edition is a signal aggregation and classification platform that collects external product signals from GitHub, Reddit, X (Twitter), Discord, and Stack Overflow, deduplicates and classifies them, and surfaces them alongside existing issues through two-way sync with Jira, GitHub, and Linear.

**Core Mission**: Provide engineering and product teams with shared visibility into customer feedback and delivery progress in one place, reducing manual triage and context switching.

## Architecture Layers

### 1. Backend Layer (Node.js/TypeScript)

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Sequelize
- **Database**: PostgreSQL
- **Authentication**: Passport.js (GitHub, Google, Facebook, Slack OAuth)
- **API Documentation**: OpenAPI/Swagger

**Services:**
- **API Service** (`src/bin/api.ts`): Main REST API server
  - Handles HTTP requests
  - Authentication and authorization
  - Rate limiting with express-rate-limit
  - CORS configuration
  - Helmet security headers

- **Job Generator** (`src/bin/job-generator.ts`): Temporal workflow scheduler
  - Schedules background jobs
  - Manages workflow execution
  - Handles cron-based tasks

- **Node.js Worker** (`src/bin/nodejs-worker`): Temporal worker
  - Executes background workflows
  - Processes async tasks
  - Handles long-running operations

- **Discord WebSocket** (`src/bin/discord-ws.ts`): Real-time Discord integration
  - Maintains WebSocket connection to Discord
  - Processes Discord events
  - Handles Discord bot interactions

**Key Patterns:**
- **Monorepo Structure**: Shared libraries in `services/libs/`
- **Service-Oriented**: Each service runs independently
- **Environment-Based Config**: `.env.dist.local` and `.env.override.local`
- **Path Aliases**: Using `tsconfig-paths` for clean imports
- **Hot Reload**: Nodemon for development

### 2. Frontend Layer (Vue 3/TypeScript)

**Technology Stack:**
- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Language**: TypeScript
- **UI Library**: Element Plus
- **Styling**: Tailwind CSS
- **State Management**: Pinia (primary) + Vuex (legacy)
- **Routing**: Vue Router 4
- **Charts**: Chart.js with Chartkick
- **Rich Text**: TipTap
- **Analytics**: CubeJS client

**Key Features:**
- **Component-Based**: Modular Vue 3 components
- **Reactive State**: Pinia stores for state management
- **Type-Safe**: Full TypeScript support
- **Real-Time**: Socket.io client for live updates
- **Drag-and-Drop**: Vue Draggable for UI interactions
- **Form Validation**: Vuelidate for form handling
- **Lazy Loading**: Vue3-lazyload for performance

**Build Modes:**
- `localhost`: Local development
- `staging`: Staging environment
- `prod`: Production build

### 3. Services Layer (Python/Temporal)

**Technology Stack:**
- **Language**: Python
- **Workflow Engine**: Temporal
- **Message Queue**: AWS SQS
- **Search**: OpenSearch
- **Cache**: Redis
- **Storage**: AWS S3

**Shared Libraries** (`services/libs/`):
- `@gitmesh/common`: Shared utilities
- `@gitmesh/temporal`: Temporal workflow definitions
- `@gitmesh/integrations`: External API integrations
- `@gitmesh/opensearch`: Search functionality
- `@gitmesh/redis`: Caching layer
- `@gitmesh/sqs`: Message queue handling
- `@gitmesh/logging`: Structured logging
- `@gitmesh/tracing`: Distributed tracing
- `@gitmesh/alerting`: Alert management
- `@gitmesh/feature-flags`: Feature flag system
- `@gitmesh/cubejs`: Analytics queries
- `@gitmesh/types`: Shared TypeScript types

### 4. Infrastructure Layer

**Technology Stack:**
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL
- **Cache**: Redis
- **Search**: OpenSearch
- **Message Queue**: AWS SQS
- **Object Storage**: AWS S3
- **Monitoring**: PM2 for process management

**Docker Services:**
- `api`: Backend API service
- `frontend`: Vue 3 frontend
- `job-generator`: Temporal scheduler
- `nodejs-worker`: Temporal worker
- `discord-ws`: Discord WebSocket service
- `postgres`: PostgreSQL database
- `redis`: Redis cache
- `opensearch`: OpenSearch cluster
- `nginx`: Reverse proxy

## Data Flow

### Signal Aggregation Flow

The signal aggregation pipeline follows this sequence:
1. External sources (GitHub, Reddit, X, Discord, Stack Overflow) generate signals
2. Integration services collect signals using the @gitmesh/integrations library
3. Signals are queued in AWS SQS for reliable processing
4. Temporal workers (nodejs-worker) consume messages from the queue
5. Deduplication and classification logic processes each signal
6. Processed signals are stored in PostgreSQL using Sequelize ORM
7. Signals are indexed in OpenSearch for full-text search capabilities
8. API Service exposes signals through REST endpoints
9. Frontend displays signals to users in the Vue 3 interface

### Two-Way Sync Flow

The bidirectional synchronization with external tools operates as follows:
1. GitMesh CE maintains two-way sync with Jira, GitHub, and Linear
2. Webhook handlers in the API Service receive events from external systems
3. Temporal workflows execute background synchronization tasks
4. PostgreSQL manages synchronization state and tracks changes
5. External API calls through @gitmesh/integrations push updates to external systems
6. Changes flow in both directions, keeping systems in sync

### Real-Time Updates Flow

Real-time updates to the frontend follow this pattern:
1. Backend events trigger when data changes occur
2. Socket.io server (running in API Service) broadcasts events
3. Socket.io client in the frontend receives event notifications
4. Pinia store updates with new data from the event
5. Vue components automatically re-render with updated state

## Module Relationships

### Backend Modules

The backend source code is organized into these directories:
- **bin/**: Service entry points for starting different processes
- **api/**: REST API routes and controllers handling HTTP requests
- **database/**: Sequelize models, migrations, and database setup
  - **models/**: Database model definitions
  - **migrations/**: Schema migration files
  - **initializers/**: Database initialization scripts
- **services/**: Business logic layer containing core functionality
- **middlewares/**: Express middleware functions for request processing
- **security/**: Authentication and security utility functions
- **serverMiddlewares/**: Server-level middleware configuration
- **utils/**: Shared utility functions used across the application
- **documentation/**: OpenAPI specification files

### Frontend Modules

The frontend source code is organized into these directories:
- **modules/**: Feature-specific modules organized by domain
  - **auth/**: Authentication and user management
  - **dashboard/**: Main dashboard views and components
  - **signals/**: Signal management and display
  - **integrations/**: Integration configuration interfaces
  - **settings/**: User and system settings
- **shared/**: Shared code used across features
  - **components/**: Reusable Vue components
  - **composables/**: Vue 3 composable functions
  - **utils/**: Utility functions
- **store/**: Pinia store definitions for state management
- **router/**: Vue Router configuration and route definitions
- **assets/**: Static assets like images and styles

## Key Architectural Decisions

### 1. Monorepo Structure
- **Why**: Share code between backend, frontend, and services
- **How**: Workspace packages in `services/libs/`
- **Benefit**: Single source of truth, easier refactoring

### 2. Temporal for Background Jobs
- **Why**: Reliable, durable workflow execution
- **How**: Job generator schedules, workers execute
- **Benefit**: Fault-tolerant, scalable async processing

### 3. OpenSearch for Signal Search
- **Why**: Full-text search across aggregated signals
- **How**: Index signals after classification
- **Benefit**: Fast, relevant search results

### 4. Two-Way Sync Architecture
- **Why**: Keep GitMesh in sync with external tools
- **How**: Webhooks + polling + Temporal workflows
- **Benefit**: Real-time updates, no data loss

### 5. Socket.io for Real-Time Updates
- **Why**: Push updates to frontend without polling
- **How**: WebSocket connection from frontend to API
- **Benefit**: Instant UI updates, better UX

## Security Architecture

### Authentication
- **OAuth 2.0**: GitHub, Google, Facebook, Slack
- **JWT Tokens**: Stateless authentication
- **Passport.js**: Strategy-based auth middleware

### Authorization
- **Role-Based Access Control (RBAC)**: User roles and permissions
- **Tenant Isolation**: Multi-tenant data separation
- **API Rate Limiting**: Prevent abuse

### Data Protection
- **Secrets Management**: Environment variables, never committed
- **Input Validation**: Sanitize all user inputs
- **Output Encoding**: Prevent XSS attacks
- **HTTPS Only**: All communication encrypted
- **Helmet.js**: Security headers

## Performance Considerations

### Backend
- **Connection Pooling**: PostgreSQL and Redis pools
- **Caching Strategy**: Redis for frequently accessed data
- **Async Processing**: Temporal for long-running tasks
- **Database Indexing**: Optimized queries

### Frontend
- **Code Splitting**: Vite lazy loading
- **Component Lazy Loading**: Vue async components
- **Image Lazy Loading**: Vue3-lazyload
- **Bundle Optimization**: Rollup tree-shaking
- **CDN**: Static assets served from CDN

## Deployment Architecture

### Development

Local development environment runs all services on the developer's machine:
- Backend API runs on localhost:8080
- Frontend development server runs on localhost:8081
- PostgreSQL database runs on localhost:5432
- Redis cache runs on localhost:6379
- OpenSearch cluster runs on localhost:9200

All services communicate over localhost, with hot reload enabled for rapid development.

### Production

Production deployment uses containerized services orchestrated by Docker Compose or Kubernetes:
- Nginx serves as reverse proxy and handles SSL termination
- API Service runs in multiple instances for high availability
- Frontend is served as static files through Nginx
- Temporal workers run as separate processes for background jobs
- PostgreSQL runs as a managed database service
- Redis runs as a managed cache service
- OpenSearch runs as a managed cluster for search functionality

Services communicate over internal networks with proper security boundaries.

## CE/EE Boundary

**Community Edition (CE)** includes:
- Signal aggregation from external sources
- Deduplication and classification
- Two-way sync with Jira, GitHub, Linear
- Basic analytics and dashboards
- Open source under Apache 2.0

**Enterprise Edition (EE)** adds (NOT in this codebase):
- Capacity-aware intelligence layer
- Ranked backlogs with constraints
- Agentic interface for prioritization
- Approval workflows and audit logs
- Proprietary, subscription-based

**CRITICAL**: Never mix CE and EE code. All code in this repository is CE only.

## Testing Architecture

### Backend Testing
- **Framework**: Jest
- **Types**: Unit tests, integration tests
- **Coverage**: Core logic and API endpoints
- **Mocking**: node-mocks-http for HTTP mocking

### Frontend Testing
- **Framework**: Cypress
- **Types**: E2E tests, component tests
- **Environments**: localhost, staging
- **Visual Testing**: Screenshot comparison

### Database Testing
- **Test DB**: Separate test database
- **Migrations**: Run migrations before tests
- **Seeding**: Test data seeding
- **Cleanup**: Rollback after tests

## Monitoring and Observability

### Logging
- **Backend**: Bunyan structured logging
- **Frontend**: LogRocket for session replay
- **Format**: JSON logs for parsing

### Tracing
- **Distributed Tracing**: `@gitmesh/tracing` library
- **Correlation IDs**: Track requests across services

### Metrics
- **Process Monitoring**: PM2 metrics
- **Application Metrics**: Custom metrics via PM2 I/O

### Alerting
- **Alert Management**: `@gitmesh/alerting` library
- **Channels**: Email, Slack, webhooks

## Development Workflow

### Local Development
1. Clone repository
2. Run `./scripts/cli clean-dev`
3. Backend runs on `localhost:8080`
4. Frontend runs on `localhost:8081`
5. Hot reload enabled for both

### Database Migrations
1. Create migration: `npm run sequelize-cli:source -- migration:generate --name <name>`
2. Run migrations: `./cli scaffold migrate-up`
3. Rollback: `./cli scaffold migrate-down`

### Adding New Features
1. Backend: Add route → controller → service → model
2. Frontend: Add route → view → component → store
3. Shared: Add types to `@gitmesh/types`
4. Test: Add unit tests and E2E tests

## Common Patterns

### Backend Patterns
- **Controller-Service Pattern**: Controllers handle HTTP, services handle logic
- **Repository Pattern**: Database access through repositories
- **Middleware Chain**: Express middleware for cross-cutting concerns
- **Error Handling**: Centralized error handler middleware

### Frontend Patterns
- **Composition API**: Vue 3 composables for reusable logic
- **Store Pattern**: Pinia stores for state management
- **Component Composition**: Small, focused components
- **Props Down, Events Up**: Unidirectional data flow

### Integration Patterns
- **Webhook Handlers**: Receive events from external systems
- **Polling**: Periodic checks for updates
- **Retry Logic**: Exponential backoff for failed requests
- **Circuit Breaker**: Prevent cascading failures

## Troubleshooting

### Common Issues
1. **Connection Pool Exhaustion**: Increase pool size or fix connection leaks
2. **Memory Leaks**: Check for unclosed connections or event listeners
3. **Slow Queries**: Add database indexes or optimize queries
4. **WebSocket Disconnects**: Implement reconnection logic
5. **Build Failures**: Clear node_modules and reinstall

### Debug Commands
- Check logs: `./cli service <name> logs`
- Check status: `./cli service <name> status`
- Restart service: `./cli service <name> restart`
- Database backup: `./cli db-backup <name>`
- Database restore: `./cli db-restore <name>`
