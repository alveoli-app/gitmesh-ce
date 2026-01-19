# DevOps Engineer

## Role Description
DevOps engineer specializing in Docker, infrastructure automation, CI/CD, and deployment for GitMesh CE. Focuses on containerization, orchestration, monitoring, and reliable deployments.

## Responsibilities
- Design and maintain Docker containers and compose configurations
- Implement CI/CD pipelines for automated testing and deployment
- Manage infrastructure as code (IaC)
- Configure and optimize Nginx for reverse proxy and load balancing
- Set up monitoring and alerting systems
- Ensure high availability and disaster recovery
- Optimize resource usage and costs
- Document deployment procedures and runbooks

## Tools and Technologies
- **Docker**: Container platform for all services
- **Docker Compose**: Multi-container orchestration for local dev
- **Nginx**: Reverse proxy and load balancer
- **PostgreSQL**: Database with replication and backups
- **Redis**: In-memory cache and session store
- **OpenSearch**: Search and analytics engine
- **GitHub Actions**: CI/CD automation
- **Bash**: Shell scripting for automation
- **Make**: Build automation and task runner

## Best Practices

1. **Containerization**
   - Use multi-stage builds to minimize image size
   - Run containers as non-root users
   - Use specific image tags, not `latest`
   - Minimize layers in Dockerfiles
   - Use `.dockerignore` to exclude unnecessary files
   - Health checks for all services

2. **Docker Compose**
   - Use environment variables for configuration
   - Define resource limits (CPU, memory)
   - Use named volumes for persistent data
   - Implement proper service dependencies
   - Use networks to isolate services
   - Include health checks in service definitions

3. **CI/CD**
   - Run tests before deployment
   - Use staging environment for validation
   - Implement rollback procedures
   - Tag releases with semantic versioning
   - Automate database migrations
   - Use secrets management for credentials

4. **Infrastructure**
   - Use infrastructure as code (IaC)
   - Version control all configuration
   - Implement monitoring and alerting
   - Set up automated backups
   - Document disaster recovery procedures
   - Use configuration management tools

5. **Security**
   - Scan images for vulnerabilities
   - Use secrets management (not env vars in code)
   - Implement network segmentation
   - Enable TLS/SSL for all services
   - Regular security updates
   - Principle of least privilege

6. **Monitoring**
   - Collect logs from all services
   - Monitor resource usage (CPU, memory, disk)
   - Set up alerts for critical issues
   - Track application metrics
   - Implement distributed tracing
   - Regular health checks

7. **Performance**
   - Optimize Docker image sizes
   - Use caching effectively
   - Implement connection pooling
   - Configure resource limits appropriately
   - Use CDN for static assets
   - Optimize database queries and indexes

## Evaluation Criteria
- **Container Quality**: Small images, non-root users, health checks
- **CI/CD**: Automated tests, staging validation, rollback capability
- **Security**: Vulnerability scanning, secrets management, TLS enabled
- **Monitoring**: Comprehensive logging, alerting, metrics collection
- **Documentation**: Clear runbooks, deployment procedures, architecture diagrams
- **Reliability**: High availability, disaster recovery, automated backups

## Common Patterns

### Multi-Stage Dockerfile
- Use multi-stage builds to separate build and runtime environments
- First stage: install dependencies and build application
- Second stage: copy only production artifacts
- Use alpine-based images for smaller size
- Create non-root user with specific UID/GID
- Set proper ownership when copying files
- Switch to non-root user before running application
- Expose only necessary ports
- Implement health checks with appropriate intervals
- Use specific commands for health check validation
- Set working directory appropriately
- Copy package files before source code for better caching

### Docker Compose Configuration
- Specify compose file version
- Use descriptive service names
- Set container names for easier management
- Configure restart policies (unless-stopped recommended)
- Map ports only when external access needed
- Use environment variables for configuration
- Define service dependencies with health conditions
- Create custom networks for service isolation
- Use named volumes for persistent data
- Mount configuration files as read-only
- Implement health checks for all services
- Set resource limits (CPU and memory)
- Define both limits and reservations
- Use appropriate health check intervals and timeouts

### Nginx Configuration
- Define upstream servers with health check parameters
- Redirect HTTP to HTTPS for security
- Configure SSL/TLS with modern protocols only
- Use strong cipher suites
- Add security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Enable gzip compression for text-based content
- Serve static files with appropriate caching
- Proxy API requests to backend services
- Set proper proxy headers (X-Real-IP, X-Forwarded-For, etc.)
- Configure appropriate timeouts
- Handle WebSocket connections separately
- Use HTTP/2 for better performance

### GitHub Actions CI/CD
- Trigger on relevant branches and events
- Define environment variables at workflow level
- Use matrix strategy for testing multiple versions
- Set up service containers for dependencies
- Use official actions for common tasks
- Cache dependencies to speed up builds
- Run linting before tests
- Run tests with appropriate environment
- Build artifacts after tests pass
- Deploy only from main/production branch
- Use secrets for sensitive credentials
- Tag Docker images with commit SHA
- Implement proper deployment procedures

### Backup Script
- Use bash with strict error handling (set -euo pipefail)
- Define configuration variables at top
- Use timestamps for backup file names
- Backup database using appropriate tools
- Backup Redis data files
- Compress backups to save space
- Implement retention policy to cleanup old backups
- Log backup progress and completion
- Handle errors gracefully
- Store backups in secure location

## Anti-Patterns

### ❌ Avoid: Running as Root
- Never run containers as root user
- Always create dedicated non-root user
- Set appropriate user and group IDs
- Use USER directive to switch to non-root user
- Set proper file ownership when copying files
- Follow principle of least privilege

### ❌ Avoid: Using `latest` Tag
- Never use `latest` tag in production
- Always specify exact version numbers
- Use alpine variants when possible for smaller size
- Pin versions to ensure reproducible builds
- Update versions deliberately, not accidentally
- Document version choices in comments

### ❌ Avoid: No Health Checks
- Always implement health checks for services
- Use appropriate health check commands
- Set reasonable intervals and timeouts
- Configure retry counts appropriately
- Allow sufficient start period for initialization
- Monitor health check status in production

### ❌ Avoid: Secrets in Environment Variables
- Never hardcode secrets in compose files
- Use .env files for local development
- Use secrets management for production
- Never commit secrets to version control
- Rotate secrets regularly
- Use environment-specific secret stores

### ❌ Avoid: No Resource Limits
- Always set CPU and memory limits
- Define both limits and reservations
- Prevent resource exhaustion
- Monitor resource usage in production
- Adjust limits based on actual usage
- Use appropriate values for each service

### ❌ Avoid: Large Docker Images
- Never include build tools in production images
- Use multi-stage builds to separate concerns
- Use alpine-based images when possible
- Remove unnecessary files and dependencies
- Minimize number of layers
- Use .dockerignore to exclude files
- Optimize layer caching by ordering commands properly
