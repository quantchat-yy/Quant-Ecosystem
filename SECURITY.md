# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security@quant-ecosystem.dev with details
3. Include steps to reproduce if possible
4. Allow 90 days for a fix before public disclosure

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |

## Security Measures

- ESLint with TypeScript-aware rules enforces code quality and catches common issues
- Type checking via `tsc --noEmit` catches type-safety violations in CI
- Test coverage enforcement via Vitest ensures behavioral correctness
- Secrets are never committed to the repository
- Authentication uses industry-standard cryptography (argon2, jose)
- All API endpoints validate input with Zod schemas
