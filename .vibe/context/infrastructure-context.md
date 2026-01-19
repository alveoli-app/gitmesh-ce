# Infrastructure Context: GitMesh CE

## Overview

This document provides infrastructure-specific architectural patterns, Docker and deployment guidelines, and CI/CD best practices for GitMesh CE. It describes the infrastructure setup, patterns, and principles without providing specific code implementations.

## Technology Stack

- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL
- **Cache**: Redis
- **Search**: OpenSearch
- **Message Queue**: AWS SQS
- **Object Storage**: AWS S3
- **Process Management**: PM2
- **Orchestration**: Docker Compose (local), Kubernetes (production)

## Project Structure

```
.
├── docker-compose.yml          # Main compose file
├── backend/
│   ├── Dockerfile             # Backend container
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile.dev         # Frontend dev container
│   ├── Dockerfile.kube        # Frontend prod container
│   └── nginx.kube.conf        # Nginx config
├── services/
│   ├── Dockerfile             # Services container
│   └── .dockerignore
├── scripts/
│   ├── cli                    # CLI tool for management
│   ├── dev.sh                 # Development setup
│   └── services/              # Service configurations
│       ├── api.yaml
│       ├── frontend.yaml
│       └── *-worker.yaml
└── Makefile                   # Build automation
```


## Docker Patterns

### 1. Multi-Stage Builds

Optimize Docker images with multi-stage builds:

**Multi-Stage Build Benefits**:
- Smaller final image size
- Separate build and runtime dependencies
- Improved security (fewer tools in production)
- Faster builds with layer caching
- Clean separation of concerns

**Build Stage Principles**:
- Stage 1: Build artifacts (compile, bundle)
- Stage 2: Production runtime (minimal dependencies)
- Copy only necessary files between stages
- Use appropriate base images per stage
- Name stages for clarity

**Base Image Selection**:
- Use Alpine Linux for smaller images
- Use specific version tags (not latest)
- Choose official images when available
- Consider security updates

### 2. Docker Compose Configuration

Define services with Docker Compose:

**Service Definition Principles**:
- Define all application services
- Configure service dependencies
- Set environment variables
- Mount volumes for persistence
- Expose necessary ports
- Configure health checks
- Set restart policies

**Service Configuration**:
- image: Container image to use
- build: Build configuration
- environment: Environment variables
- volumes: Data persistence
- ports: Port mappings
- depends_on: Service dependencies
- healthcheck: Health check configuration

**Health Check Configuration**:
- Define health check command
- Set check interval
- Set timeout duration
- Set retry count
- Use for service readiness

### 3. Docker Ignore

Optimize build context with .dockerignore:

**Dockerignore Principles**:
- Exclude node_modules directory
- Exclude build artifacts
- Exclude version control files
- Exclude environment files
- Exclude documentation
- Exclude IDE configurations
- Reduce build context size
- Speed up builds

### 4. Health Checks

Implement health check endpoints:

**Health Check Endpoint**:
- Create /health route
- Check database connectivity
- Check Redis connectivity
- Check external dependencies
- Return 200 for healthy
- Return 503 for unhealthy
- Include service status details
- Include timestamp

## Nginx Configuration

### 1. Reverse Proxy Setup

**Reverse Proxy Principles**:
- Define upstream servers
- Configure proxy pass rules
- Set proxy headers correctly
- Handle WebSocket connections
- Configure timeouts
- Enable HTTP/2

**Proxy Configuration**:
- upstream: Define backend servers
- proxy_pass: Forward requests
- proxy_http_version: Use HTTP/1.1
- proxy_set_header: Set request headers
- proxy_cache_bypass: Control caching

**Required Headers**:
- Host: Original host header
- X-Real-IP: Client IP address
- X-Forwarded-For: Proxy chain
- X-Forwarded-Proto: Original protocol
- Upgrade/Connection: For WebSockets

**Timeout Configuration**:
- proxy_connect_timeout: Connection timeout
- proxy_send_timeout: Send timeout
- proxy_read_timeout: Read timeout

### 2. SSL Configuration

**SSL/TLS Setup**:
- Listen on port 443 with SSL
- Configure certificate paths
- Set SSL protocols (TLS 1.2, 1.3)
- Configure cipher suites
- Enable HTTP/2
- Add security headers

**Security Headers**:
- Strict-Transport-Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

**HTTP to HTTPS Redirect**:
- Listen on port 80
- Return 301 redirect to HTTPS
- Preserve request URI

### 3. Caching Strategy

**Static Asset Caching**:
- Cache images, CSS, JS files
- Set long expiration times
- Add Cache-Control headers
- Use immutable directive

**API Response Caching**:
- Cache selective endpoints
- Set appropriate cache duration
- Use cache keys
- Add cache status header
- Configure cache path and size

## Database Management

### 1. Migrations

**Migration Management**:
- Create migration with CLI tool
- Run migrations with scaffold command
- Rollback migrations if needed
- Check migration status
- Version control migrations

**Migration Commands**:
- Generate: Create new migration file
- Up: Apply pending migrations
- Down: Rollback last migration
- Status: Check applied migrations

### 2. Backup and Restore

**Database Backup**:
- Use CLI tool for backups
- Include date in backup name
- Store backups securely
- Automate with cron jobs
- Test restore procedures

**Backup Strategy**:
- Daily automated backups
- Retain backups for specified period
- Store off-site for disaster recovery
- Verify backup integrity

### 3. Connection Pooling

**Connection Pool Configuration**:
- Set maximum connections
- Set minimum connections
- Configure acquire timeout
- Configure idle timeout
- Enable logging in development
- Configure SSL for production

**Pool Management**:
- Monitor pool utilization
- Adjust size based on load
- Handle connection errors
- Prevent connection leaks


## CI/CD Guidelines

### 1. GitHub Actions Workflow

**CI Workflow Structure**:
- Trigger on push and pull requests
- Run tests for backend and frontend
- Build Docker images
- Push to container registry
- Run in parallel when possible

**Backend Testing Job**:
- Set up Node.js environment
- Configure service containers (PostgreSQL, Redis)
- Install dependencies
- Run linter
- Run tests with coverage
- Upload coverage reports

**Frontend Testing Job**:
- Set up Node.js environment
- Install dependencies
- Run linter
- Build application
- Run E2E tests

**Docker Build Job**:
- Run after tests pass
- Set up Docker Buildx
- Login to container registry
- Build and push images
- Tag with commit SHA and latest
- Use layer caching

### 2. Deployment Pipeline

**Deployment Workflow**:
- Trigger on main branch push
- Deploy to staging first
- Run smoke tests
- Deploy to production after approval
- Wait for deployment stability
- Run production smoke tests

**Staging Deployment**:
- Configure AWS credentials
- Update ECS service
- Force new deployment
- Wait for services to stabilize
- Run health checks

**Production Deployment**:
- Require manual approval
- Use same process as staging
- Monitor deployment closely
- Have rollback plan ready

### 3. Pre-commit Hooks

**Pre-commit Configuration**:
- Check trailing whitespace
- Fix end of file
- Validate YAML and JSON
- Check for large files
- Check for merge conflicts
- Run linters for backend and frontend

**Hook Benefits**:
- Catch issues early
- Enforce code quality
- Prevent bad commits
- Automate checks

## Monitoring and Logging

### 1. Application Logging

**Logging Configuration**:
- Use structured logging library (bunyan)
- Set log level based on environment
- Log to stdout in development
- Log to files in production
- Include serializers for objects
- Add context to log messages

**Log Levels**:
- debug: Detailed debugging information
- info: General informational messages
- warn: Warning messages
- error: Error messages with stack traces
- fatal: Critical errors

**Logging Best Practices**:
- Include relevant context (IDs, user info)
- Log errors with full details
- Don't log sensitive information
- Use structured logging format
- Aggregate logs centrally

### 2. PM2 Configuration

**PM2 Process Management**:
- Configure multiple applications
- Set instance count (cluster mode)
- Configure environment variables
- Set log file paths
- Configure memory limits
- Set restart policies

**PM2 Features**:
- Cluster mode for load balancing
- Automatic restarts on crashes
- Memory limit enforcement
- Log management
- Process monitoring

### 3. Health Monitoring

**Health Check Script**:
- Check API health endpoint
- Check database connectivity
- Check Redis connectivity
- Send alerts on failures
- Run periodically with cron
- Log check results

**Monitoring Principles**:
- Monitor all critical services
- Set up alerting
- Check dependencies
- Log monitoring results
- Automate health checks

## Kubernetes Deployment

### 1. Deployment Configuration

**Kubernetes Deployment**:
- Define deployment metadata
- Set replica count
- Configure pod selector
- Define container specification
- Set environment variables
- Configure resource limits
- Add liveness and readiness probes

**Container Configuration**:
- Specify container image
- Expose container ports
- Set environment variables from secrets
- Define resource requests and limits
- Configure health check probes

**Health Probes**:
- Liveness probe: Check if container is alive
- Readiness probe: Check if ready for traffic
- Use HTTP GET on health endpoint
- Set initial delay and period
- Configure timeout and failure threshold

### 2. Service Configuration

**Kubernetes Service**:
- Define service metadata
- Configure selector to match pods
- Expose service ports
- Set service type (LoadBalancer, ClusterIP)
- Map service port to container port

**Service Types**:
- ClusterIP: Internal cluster access
- NodePort: External access via node port
- LoadBalancer: Cloud load balancer
- ExternalName: DNS CNAME record

### 3. Ingress Configuration

**Ingress Setup**:
- Define ingress metadata
- Configure TLS certificates
- Set ingress class (nginx)
- Define routing rules
- Map paths to services

**Ingress Features**:
- SSL/TLS termination
- Path-based routing
- Host-based routing
- Automatic certificate management
- Load balancing

## Performance Optimization

### 1. Database Indexing

**Index Creation**:
- Add indexes for frequently queried columns
- Create composite indexes for multi-column queries
- Use partial indexes for filtered queries
- Index foreign keys
- Index columns used in WHERE clauses
- Index columns used in ORDER BY

**Index Types**:
- Single column: One field
- Composite: Multiple fields
- Unique: Enforce uniqueness
- Partial: Conditional index

**Index Best Practices**:
- Don't over-index (impacts writes)
- Monitor slow queries
- Analyze query plans
- Remove unused indexes
- Balance read vs write performance

### 2. Query Optimization

**Query Optimization Techniques**:
- Avoid N+1 query problems
- Use eager loading for related data
- Select only needed columns
- Use pagination for large result sets
- Add appropriate indexes
- Analyze query execution plans

**N+1 Problem Solution**:
- Use JOIN operations
- Load related data in single query
- Use ORM include/eager loading
- Avoid loading data in loops

### 3. Caching Strategy

**Caching Principles**:
- Cache frequently accessed data
- Set appropriate TTL values
- Invalidate cache on updates
- Use consistent cache keys
- Handle cache failures gracefully
- Monitor cache hit rates

**Cache Invalidation**:
- Delete on update
- Delete on delete
- Use cache tags
- Set expiration times
- Consider cache-aside pattern

## Security Best Practices

### 1. Environment Variables

**Environment Variable Management**:
- Store all secrets in environment variables
- Never commit secrets to version control
- Use .env files for local development
- Add .env to .gitignore
- Document required variables
- Provide example .env file

**Environment Variable Types**:
- Database connection strings
- API keys and secrets
- JWT secrets
- AWS credentials
- Service URLs

### 2. Secrets Management

**Kubernetes Secrets**:
- Store sensitive data in Secrets
- Reference secrets in deployments
- Use stringData for plain text
- Mount as environment variables
- Rotate secrets regularly
- Limit secret access

**Secret Types**:
- Opaque: Generic secrets
- TLS: Certificate and key
- Docker registry: Image pull secrets
- Service account: API tokens

### 3. Network Policies

**Network Policy Configuration**:
- Define pod selectors
- Specify ingress rules
- Specify egress rules
- Allow only necessary traffic
- Deny by default
- Document network flows

**Policy Types**:
- Ingress: Incoming traffic rules
- Egress: Outgoing traffic rules
- Pod selector: Which pods to apply to
- Namespace selector: Cross-namespace rules

## Troubleshooting

### 1. Common Issues

**Container Won't Start**:
- Check container logs
- Verify container status
- Inspect container configuration
- Check resource constraints
- Verify image availability

**Database Connection Issues**:
- Test connection manually
- Check PostgreSQL logs
- Verify network connectivity
- Check credentials
- Verify database exists

**High Memory Usage**:
- Check container stats
- Monitor PM2 processes
- Review memory limits
- Restart services if needed
- Investigate memory leaks

### 2. Debug Commands

**Service Management**:
- View service logs with CLI tool
- Check service status
- Restart services
- Execute commands in containers
- Check database migration status

**Docker Commands**:
- docker logs: View container logs
- docker ps: List containers
- docker inspect: Inspect configuration
- docker exec: Run commands in container
- docker stats: Monitor resource usage

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
