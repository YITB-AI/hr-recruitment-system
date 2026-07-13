# Project Security, Compliance & Enterprise Standards (Mandatory)

This project is being built as a **production-ready, enterprise-grade HRMS/ATS SaaS platform**. Every feature, module, API, database operation, authentication flow, infrastructure component, and deployment configuration must follow modern security best practices and applicable compliance standards.

Whenever you write, modify, refactor, or review code, assume these requirements are mandatory. Never implement shortcuts that weaken security, privacy, scalability, maintainability, or compliance.

---

# Compliance Standards

The entire project must be designed to align with the principles and best practices of:

* GDPR (General Data Protection Regulation)
* CCPA/CPRA (California Consumer Privacy Act)
* PIPEDA (Canada)
* OWASP Top 10
* OWASP ASVS (Application Security Verification Standard)
* SOC 2 Security Trust Principles
* ISO/IEC 27001 Information Security Management

Use these standards as architectural guidance throughout the project.

---

# Secure Development Lifecycle (Secure SDLC)

Follow a Secure SDLC throughout development.

This includes:

* Security-first architecture
* Privacy by Design
* Secure by Default
* Least Privilege
* Defense in Depth
* Principle of Fail Securely
* Secure Coding Standards
* Input Validation
* Output Encoding
* Dependency Security
* Vulnerability Management
* Code Reviews
* Security Testing
* Continuous Security Improvements

Never introduce technical debt that compromises security.

---

# Authentication & Identity

The authentication system must implement:

* Multi-Factor Authentication (MFA)
* Role-Based Access Control (RBAC)
* Principle of Least Privilege
* Strong password policy
* Password hashing using **Argon2id** (preferred) or **bcrypt**
* Email verification
* Secure password reset using one-time, time-limited tokens
* Session timeout
* Device and session management
* Login history
* Failed login protection
* Account lockout after repeated failed attempts
* Brute-force protection
* CAPTCHA after multiple failed login attempts
* Secure logout from individual devices
* Secure logout from all devices
* Refresh token rotation (when using JWT)
* Short-lived access tokens
* Secure session handling
* Secure cookie configuration
* HttpOnly cookies
* Secure cookies
* SameSite cookie protection

Passwords must never be stored or transmitted in plain text.

---

# Authorization

Every request must be properly authorized.

Implement:

* Granular permissions
* Role-Based Access Control (RBAC)
* Department-based access
* Team-based permissions
* Company/Tenant isolation (Multi-Tenant SaaS)
* Resource-level authorization
* API authorization checks on every request
* Ownership validation
* Admin approval workflows where appropriate

Never trust client-side authorization.

Authorization must always be enforced on the server.

---

# API Security

Every API must follow secure development practices.

Implement:

* HTTPS only
* TLS 1.2 or TLS 1.3
* Authentication on protected endpoints
* Authorization on every request
* Input validation
* Output sanitization
* SQL Injection prevention
* XSS prevention
* CSRF protection (where applicable)
* Secure CORS configuration
* Rate limiting
* API throttling
* Request validation
* Response validation
* Secure error handling
* Standardized error responses
* API versioning
* Idempotent operations where appropriate
* Request size limits

Never expose internal implementation details through API responses.

---

# Encryption & Data Protection

Sensitive information must always be protected.

Implement:

* Encryption at rest
* Encryption in transit
* Database encryption
* Encrypted backups
* Encryption for sensitive fields (such as national IDs, tax IDs, bank details, salaries, addresses, and personal information)
* Secure key management
* Regular key rotation
* Secret rotation
* Environment-based secret management

Never hardcode:

* API keys
* Database credentials
* JWT secrets
* Encryption keys
* SMTP credentials
* OAuth credentials
* Cloud credentials
* Third-party secrets

All secrets must be stored securely using environment variables or a secure secrets manager.

---

# File Security

All uploaded files must be securely handled.

Implement:

* Virus and malware scanning
* File type validation
* MIME type verification
* File size limits
* Secure object storage
* Private storage buckets
* Randomized file names
* Signed URLs
* Temporary download links
* Prevent executable file uploads
* Secure file permissions

Files must never be publicly accessible by default.

---

# Database Security

Database security requirements include:

* Parameterized queries
* ORM protections
* SQL Injection prevention
* Least-privileged database users
* Secure database credentials
* Database encryption
* Encrypted backups
* Audit logging
* Proper indexing
* Transaction integrity
* Secure migrations

---

# Infrastructure Security

Infrastructure must follow enterprise security best practices.

Implement:

* HTTPS everywhere
* Secure DNS
* Web Application Firewall (WAF)
* DDoS protection
* Backup strategy
* Disaster recovery plan
* Monitoring
* Logging
* Alerting
* Health checks
* Container security (if applicable)
* Network segmentation
* Secure server configuration
* Automatic security updates where appropriate

---

# Audit Logging

Every sensitive action must generate an audit log.

This includes:

* User login
* Logout
* Failed login attempts
* Password changes
* Password reset requests
* MFA changes
* Email verification
* Profile updates
* Job creation
* Job updates
* Candidate creation
* Candidate updates
* Candidate deletion
* Offer approvals
* Offer rejections
* Interview scheduling
* Document uploads
* Document downloads
* Role changes
* Permission changes
* Company settings changes
* Data exports
* User creation
* User deletion
* Administrative actions
* API key creation
* API key deletion

Audit logs should include:

* User ID
* Company/Tenant ID
* Timestamp
* IP address (where appropriate and legally permissible)
* Device/User Agent
* Action performed
* Resource affected
* Success or failure status

Audit logs should be immutable and protected from unauthorized modification.

---

# Privacy by Design

Design every feature with privacy in mind.

Implement:

* Data minimization
* Purpose limitation
* Storage limitation
* User consent management where applicable
* Right to access
* Right to update
* Right to delete
* Right to data portability
* Data retention controls
* Data anonymization where appropriate

Only collect information that is necessary.

---

# Legal & Compliance Documents

The application must include:

* Privacy Policy
* Terms of Service
* Cookie Policy (where applicable)
* Data Retention Policy
* Data Deletion Policy
* Security Policy
* Incident Response Plan
* Acceptable Use Policy
* Vendor/Subprocessor documentation (where applicable)

---

# Configuration Management

Configuration must follow best practices.

* Store all environment-specific values in the `.env` file or a secure secrets manager.
* Never hardcode Base URLs, API endpoints, credentials, or environment-specific values.
* The application's Base URL must always be read from environment variables so changing environments only requires updating the environment configuration.
* Keep development, staging, and production configurations separate.

---

# Code Quality Standards

Every piece of code must be:

* Secure
* Modular
* Reusable
* Maintainable
* Well documented
* Type-safe where applicable
* Fully validated
* Properly tested
* Production-ready
* Scalable
* Easy to audit

Avoid duplicate code, unnecessary complexity, insecure patterns, and deprecated libraries.

---

# Security Reviews

Whenever you generate or modify code, automatically:

* Review it for security vulnerabilities.
* Verify compliance with the standards listed above.
* Check for OWASP Top 10 risks.
* Check for OWASP ASVS compliance.
* Ensure GDPR, CCPA/CPRA, and PIPEDA privacy principles are respected where applicable.
* Verify SOC 2 and ISO/IEC 27001 security principles are followed.
* Identify any compliance gaps or security weaknesses.
* Recommend improvements before considering the implementation complete.

Security and compliance are mandatory requirements, not optional enhancements. Every feature, API, component, and deployment must be designed with security, privacy, compliance, scalability, and maintainability as first-class priorities.

# Multi-Tenant Architecture & Security (Mandatory)

This application is a **multi-tenant SaaS platform**. Every feature, service, API, background job, database query, file operation, cache, and notification must be designed with complete tenant isolation. Under no circumstances should one tenant be able to access, modify, or infer another tenant's data.

## Tenant Isolation

Implement strict tenant isolation throughout the system.

Requirements include:

* Every record must belong to a tenant (Company/Organization).
* Every authenticated request must be associated with a tenant.
* Every database query must be automatically scoped to the current tenant.
* Never allow cross-tenant data access.
* Prevent tenant ID spoofing or manipulation.
* Validate tenant ownership on every protected resource.
* Background jobs, scheduled tasks, notifications, webhooks, and queues must execute within the correct tenant context.
* File storage, caches, search indexes, exports, and backups must remain tenant-aware.

## Tenant Context

The application must securely resolve the active tenant for every request using approved mechanisms such as:

* Organization subdomains
* Custom domains
* Tenant identifiers
* Secure tenant resolution middleware

Tenant information must never be trusted solely from client input.

## Authorization

Authorization must always verify both:

* The user's permissions.
* The user's membership within the current tenant.

A valid role alone must never grant access to resources owned by another tenant.

## Data Isolation

Protect all tenant data, including:

* Employees
* Candidates
* Jobs
* Departments
* Payroll data
* Documents
* Files
* Reports
* Audit logs
* Notifications
* Email templates
* Integrations
* API keys
* Webhooks
* Custom fields
* Workflow configurations

## Tenant Administration

Each tenant must have independent:

* Users
* Roles
* Permissions
* Departments
* Settings
* Branding
* Email configuration
* Integrations
* API credentials
* SSO configuration
* Billing (if applicable)
* Subscription plans
* Feature flags

No administrative action performed by one tenant should affect another tenant.

## Database & Infrastructure

Ensure:

* Tenant-aware database queries.
* Tenant-aware caching.
* Tenant-aware file storage.
* Tenant-aware logging.
* Tenant-aware search indexing.
* Tenant-aware exports.
* Tenant-aware backups.
* Tenant-aware analytics.
* Tenant-aware queues and scheduled jobs.

## Security Verification

Before completing any implementation, verify that:

* No cross-tenant data leakage is possible.
* No insecure direct object references (IDOR) exist.
* APIs cannot be manipulated to access another tenant's resources.
* Authorization checks are enforced server-side.
* Tenant isolation is maintained in all database queries, APIs, background jobs, file operations, and integrations.

Multi-tenant isolation is a mandatory security requirement and must never be bypassed.
