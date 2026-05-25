# Security Policy

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email: **security@quant-ecosystem.dev**
3. PGP Key: Available at [https://quant.io/.well-known/security.txt](https://quant.io/.well-known/security.txt)

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

| Action                         | Timeline                                                |
| ------------------------------ | ------------------------------------------------------- |
| Initial acknowledgment         | Within 24 hours                                         |
| Triage and severity assessment | Within 72 hours                                         |
| Fix development                | Within 7-30 days (based on severity)                    |
| Public disclosure              | 90 days after report (or after fix, whichever is first) |

## Supported Versions

| Version      | Supported                     |
| ------------ | ----------------------------- |
| 1.x (latest) | Yes - Active security updates |
| 0.x          | No - End of life              |

## Security Scanning

### Automated Scanning

The following security scans run automatically in CI/CD:

- **Trivy** - Container image vulnerability scanning on every build
- **npm audit** - Dependency vulnerability detection on every PR
- **CodeQL** - Static analysis for code-level security issues (weekly + on PR)
- **OWASP ZAP** - Dynamic application security testing (weekly against staging)
- **Secret scanning** - Prevents accidental credential commits

### Manual Review

- Security-focused code review for authentication, authorization, and data handling changes
- Periodic penetration testing by third-party security firms
- Annual security architecture review

## Security Architecture

### Authentication

- JWT-based authentication with RS256/HS256 signing
- Token expiration: Access tokens (15 min), Refresh tokens (7 days)
- Password hashing: argon2id with recommended parameters
- Multi-factor authentication support

### Authorization

- Role-based access control (RBAC) with fine-grained permissions
- Service-to-service authentication via signed JWTs
- API key management for external integrations

### Input Validation

- All API inputs validated with Zod schemas at the boundary
- SQL injection prevention via parameterized queries (Prisma ORM)
- XSS prevention through output encoding and Content-Security-Policy headers
- Request size limits enforced at the gateway level

### Rate Limiting

- Per-IP and per-user rate limiting on all endpoints
- Configurable limits per service via environment variables
- Redis-backed distributed rate limiting for horizontal scaling

### Transport Security

- TLS 1.2+ enforced on all external endpoints
- Internal service mesh with mTLS (via Istio/Linkerd)
- HSTS headers with preload
- Certificate management via cert-manager with auto-renewal

### Data Protection

- Encryption at rest for all databases (AWS RDS encryption)
- Encryption in transit for all inter-service communication
- PII handling follows data minimization principles
- Audit logging for all sensitive operations

## Incident Response Process

### Severity Levels

| Level         | Description                                       | Response Time | Examples                                    |
| ------------- | ------------------------------------------------- | ------------- | ------------------------------------------- |
| P0 - Critical | Active exploitation, data breach                  | 15 minutes    | RCE, SQL injection in production, data leak |
| P1 - High     | Exploitable vulnerability, no active exploitation | 4 hours       | Auth bypass, privilege escalation           |
| P2 - Medium   | Vulnerability requiring specific conditions       | 24 hours      | CSRF, stored XSS in non-critical path       |
| P3 - Low      | Minor issue, defense-in-depth improvement         | 1 week        | Information disclosure, missing headers     |

### Response Process

1. **Detection** - Automated alerts or manual report
2. **Triage** - Assess severity, assign incident commander
3. **Containment** - Isolate affected systems if necessary
4. **Investigation** - Determine root cause and impact scope
5. **Remediation** - Develop and deploy fix
6. **Communication** - Notify affected users if data was compromised
7. **Post-mortem** - Document lessons learned and prevention measures

### Communication

- Internal: Dedicated #security-incidents Slack channel
- External: Status page updates for service-affecting incidents
- Regulatory: GDPR breach notification within 72 hours if applicable

## Compliance

### SOC 2 Type II

- Annual audit of security controls
- Continuous monitoring of access controls
- Change management procedures enforced

### GDPR

- Data Processing Agreement (DPA) available upon request
- Right to erasure implemented across all services
- Data portability endpoints available
- Privacy impact assessments for new features

### Additional Measures

- Vendor security assessments for third-party integrations
- Employee security awareness training
- Background checks for team members with production access

## Bug Bounty Program

We maintain a private bug bounty program for qualified security researchers.

### Scope

- All production services (\*.quant.io)
- API endpoints
- Authentication and authorization flows
- Data handling and storage

### Out of Scope

- Denial of service attacks
- Social engineering
- Physical security
- Third-party services not controlled by Quant

### Rewards

Rewards are based on severity and impact. Contact security@quant-ecosystem.dev for program details and invitation.

## Security Contacts

- **Security Team Email**: security@quant-ecosystem.dev
- **Security Lead**: Available via security email
- **Emergency (P0 only)**: security-emergency@quant-ecosystem.dev

## Security Headers

All services enforce the following HTTP security headers:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
