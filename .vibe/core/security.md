# Security Best Practices

This document defines security standards and best practices for GitMesh Community Edition development.

## Core Security Principles

### Defense in Depth
- Implement multiple layers of security controls
- Never rely on a single security mechanism
- Validate at every boundary (client, API, service, database)
- Assume all external input is malicious

### Principle of Least Privilege
- Grant minimum necessary permissions
- Use role-based access control (RBAC)
- Limit service account permissions
- Regularly audit and revoke unused permissions

### Fail Securely
- Default to deny access
- Handle errors without exposing sensitive information
- Log security events for audit
- Gracefully degrade functionality when security checks fail

## Input Validation

### Validation Rules

**Always Validate:**
- All user input (forms, APIs, file uploads)
- Query parameters and path variables
- HTTP headers and cookies
- File names and paths
- Configuration values

**Validation Patterns:**
- Use strict validation with whitelist approach (define what is allowed)
- Apply regex patterns for format validation (usernames, emails, etc.)
- Validate data types and ranges before processing
- Trim and normalize input before validation
- Throw descriptive validation errors with clear messages

**Anti-Patterns to Avoid:**
- Blacklist validation (trying to block specific bad patterns)
- Accepting input without validation
- Validating only on the client side
- Using incomplete regex patterns that miss edge cases

### Sanitization

**HTML/XSS Prevention:**
- Use a sanitization library like DOMPurify for HTML content
- Configure allowed tags and attributes explicitly
- Escape HTML entities for text content (convert &, <, >, ", ' to entities)
- Never trust user-provided HTML without sanitization
- Use Content Security Policy headers to prevent inline scripts

**SQL Injection Prevention:**
- Always use parameterized queries or prepared statements
- Use ORM parameter binding instead of string concatenation
- Never concatenate user input directly into SQL queries
- Validate and sanitize input before database operations
- Use database-specific escaping functions when parameterization isn't possible

**Path Traversal Prevention:**
- Normalize file paths to remove directory traversal sequences
- Validate that resolved paths stay within allowed directories
- Use path.join() or equivalent to construct file paths safely
- Reject paths containing ".." or other traversal patterns
- Implement whitelist of allowed file extensions and directories

## Authentication and Authorization

### Password Security

**Password Requirements:**
- Minimum 12 characters length
- Mix of uppercase, lowercase, numbers, and special characters
- No common passwords (use password strength validation library)
- No password reuse across different accounts
- Enforce password expiration policies where appropriate

**Password Storage:**
- Hash passwords using bcrypt with appropriate salt rounds (10-12)
- Never store plain text passwords in any form
- Use secure hashing algorithms (bcrypt, argon2, scrypt)
- Store only the hash, never the original password
- Verify passwords by comparing hashes, not plain text

**Anti-Patterns to Avoid:**
- Storing passwords in plain text
- Using weak hashing algorithms (MD5, SHA1)
- Not using salt with hashing
- Logging or displaying passwords in any form

### Session Management

**Session Security:**
- Use strong random secrets for session signing (from environment variables)
- Use non-default session cookie names to avoid fingerprinting
- Set httpOnly flag on cookies to prevent XSS access
- Set secure flag to enforce HTTPS-only transmission
- Set sameSite to 'strict' or 'lax' for CSRF protection
- Configure appropriate session timeout (typically 1 hour for sensitive apps)
- Disable resave and saveUninitialized for better security
- Regenerate session IDs after authentication

**Token Security:**
- Use JWT with strong secret keys from environment variables
- Set appropriate expiration times (typically 1 hour for access tokens)
- Use secure algorithms (HS256, RS256) for signing
- Verify tokens on every request
- Handle token expiration gracefully
- Never expose tokens in URLs or logs
- Use refresh tokens for long-lived sessions

### Authorization Checks

**Access Control:**
- Always check permissions before performing sensitive actions
- Verify user roles and permissions at the service layer
- Implement role-based access control (RBAC) consistently
- Check both authentication (who you are) and authorization (what you can do)
- Prevent privilege escalation by validating all permission changes
- Implement resource-level permissions (user can only access their own data)
- Log all authorization failures for security monitoring

**Best Practices:**
- Check permissions in the service layer, not just the API layer
- Use middleware for common authorization checks
- Fail securely by denying access by default
- Provide clear error messages without exposing sensitive information
- Implement least privilege principle (grant minimum necessary permissions)

## Secret Management

### Environment Variables

**Configuration:**
- Load all secrets from environment variables, never hardcode
- Use process.env to access environment variables
- Validate that required environment variables are present at startup
- Use different secrets for different environments (dev, staging, prod)
- Configure database credentials, API keys, and secrets through environment
- Set appropriate defaults for non-sensitive configuration

**Anti-Patterns to Avoid:**
- Hardcoding passwords, API keys, or secrets in source code
- Committing secrets to version control
- Using the same secrets across environments
- Exposing secrets in error messages or logs

### Secret Storage

**Best Practices:**
- Store secrets in environment variables or secret management systems
- Never commit secrets to version control
- Use `.env` files for local development (gitignored)
- Use secret management services in production (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Use different secrets for different environments

**Detection:**
Use git-secrets or similar tools to scan for secrets:
- Run git secrets --scan to check current files
- Run git secrets --scan-history to check git history
- Use grep to search for password patterns in files
- Use grep to search for api_key patterns in files

## API Security

### Rate Limiting

**Implementation:**
- Apply rate limiting to all public API endpoints
- Use stricter limits for sensitive endpoints (login, password reset)
- Configure appropriate time windows (e.g., 15 minutes)
- Set reasonable request limits per IP address
- Skip rate limiting for successful requests on auth endpoints (only count failures)
- Return 429 status code with appropriate retry-after headers
- Use distributed rate limiting for multi-instance deployments

**Configuration Guidelines:**
- General API endpoints: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 attempts per 15 minutes per IP
- Password reset: 3 attempts per hour per email
- Adjust limits based on actual usage patterns and abuse monitoring

### CORS Configuration

**Secure CORS:**
- Configure restrictive CORS policies, never use wildcard origins
- Specify allowed origins explicitly from environment configuration
- Enable credentials only when necessary
- Limit allowed HTTP methods to those actually used
- Specify allowed headers explicitly
- Set appropriate maxAge for preflight caching
- Use HTTPS origins only in production

**Anti-Patterns to Avoid:**
- Using wildcard (*) for origin with credentials enabled
- Allowing all origins in production
- Not validating origin against whitelist
- Exposing sensitive headers unnecessarily

### Request Validation

**Middleware:**
- Validate all request inputs using validation middleware
- Check email format and normalize emails
- Validate string lengths and character sets
- Enforce password complexity requirements
- Validate numeric ranges and data types
- Return 400 status with validation errors
- Sanitize inputs after validation
- Reject requests with invalid data before processing

**Validation Rules:**
- Use validation libraries (express-validator, joi, yup)
- Define validation schemas for each endpoint
- Validate request body, query parameters, and path parameters
- Provide clear error messages for validation failures
- Log validation failures for security monitoring

## Data Protection

### Encryption

**Data at Rest:**
- Encrypt sensitive data in database (PII, payment information)
- Use database-level encryption or application-level encryption
- Store encryption keys securely, separate from encrypted data
- Use strong encryption algorithms (AES-256-GCM)
- Rotate encryption keys periodically
- Implement key management procedures

**Data in Transit:**
- Always use HTTPS/TLS for API communication
- Use TLS 1.2 or higher, disable older versions
- Enforce HTTPS with HSTS headers
- Use secure WebSocket connections (WSS) for real-time communication
- Validate SSL certificates
- Use certificate pinning for mobile apps

**Implementation Guidelines:**
- Use crypto libraries (Node.js crypto, Python cryptography)
- Generate random initialization vectors (IVs) for each encryption
- Use authenticated encryption modes (GCM, CCM)
- Store IVs alongside encrypted data
- Never reuse IVs with the same key
- Use secure random number generators

### Logging and Monitoring

**Secure Logging:**
- Log security events without including sensitive data
- Include user ID, IP address, user agent, and timestamp
- Never log passwords, tokens, or authentication credentials
- Never log personally identifiable information (PII) in plain text
- Use structured logging with consistent format
- Sanitize log data to prevent log injection attacks
- Store logs securely with appropriate access controls

**Security Events to Log:**
- Authentication attempts (success and failure)
- Authorization failures and permission denials
- Input validation failures
- Rate limit violations
- Suspicious activity patterns (multiple failed logins, unusual access patterns)
- Configuration changes
- Admin actions and privilege escalations
- Security-related errors and exceptions

## Dependency Security

### Dependency Management

**Best Practices:**
- Keep dependencies up to date
- Review security advisories regularly
- Use `npm audit` or `pip-audit` to check for vulnerabilities
- Pin dependency versions in production
- Review dependency licenses for compliance

**Automated Checks:**
For Node.js projects:
- Run npm audit to check for vulnerabilities
- Run npm audit fix to automatically fix issues

For Python projects:
- Run pip-audit to check for vulnerabilities
- Run safety check to scan dependencies

For automated updates:
- Enable dependabot for automatic dependency updates
- Enable renovate for dependency management

### Supply Chain Security

**Verification:**
- Verify package integrity with checksums
- Use lock files (package-lock.json, poetry.lock)
- Review package source code for suspicious activity
- Use private registries for internal packages
- Implement software composition analysis (SCA)

## Security Headers

### HTTP Security Headers

**Implementation:**
- Use security header middleware (helmet.js or equivalent)
- Configure Content Security Policy (CSP) to prevent XSS
- Enable HTTP Strict Transport Security (HSTS) with long max-age
- Enable X-Content-Type-Options: nosniff to prevent MIME sniffing
- Enable X-Frame-Options or frame-ancestors to prevent clickjacking
- Configure referrer policy to control referrer information
- Disable X-Powered-By header to avoid fingerprinting

**Content Security Policy:**
- Set default-src to 'self' to restrict resource loading
- Allow specific sources for scripts, styles, images as needed
- Use nonces or hashes for inline scripts when necessary
- Disable unsafe-inline and unsafe-eval in production
- Set object-src to 'none' to prevent plugin execution
- Configure connect-src to whitelist API endpoints

**HSTS Configuration:**
- Set max-age to at least 1 year (31536000 seconds)
- Include subdomains in HSTS policy
- Consider HSTS preloading for maximum security

## Incident Response

### Security Incident Handling

**If You Discover a Vulnerability:**
1. **Do Not** disclose publicly
2. **Document** the vulnerability details
3. **Report** to security@gitmesh.com
4. **Wait** for security team response
5. **Coordinate** disclosure timeline

**Report Should Include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)
- Your contact information

### Vulnerability Disclosure

**Responsible Disclosure:**
- Report to security team first
- Allow 90 days for fix before public disclosure
- Coordinate disclosure with security team
- Credit researchers appropriately

## Security Checklist

### Before Committing Code

- [ ] No hardcoded secrets or credentials
- [ ] All user input is validated and sanitized
- [ ] SQL queries use parameterized statements
- [ ] Authentication and authorization checks are present
- [ ] Sensitive data is encrypted
- [ ] Security headers are configured
- [ ] Error messages don't expose sensitive information
- [ ] Logging doesn't include sensitive data
- [ ] Dependencies are up to date
- [ ] Security tests are passing

### Before Deploying

- [ ] Environment variables are configured
- [ ] HTTPS/TLS is enabled
- [ ] Rate limiting is configured
- [ ] CORS policy is restrictive
- [ ] Security headers are enabled
- [ ] Monitoring and alerting are configured
- [ ] Backup and recovery procedures are tested
- [ ] Security audit is completed

## Resources

### Tools
- **OWASP ZAP**: Web application security scanner
- **npm audit**: Node.js dependency vulnerability scanner
- **Snyk**: Dependency and container security
- **SonarQube**: Code quality and security analysis
- **git-secrets**: Prevent committing secrets

### References
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- CWE Top 25: https://cwe.mitre.org/top25/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
