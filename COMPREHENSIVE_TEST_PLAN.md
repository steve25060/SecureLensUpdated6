# SecureLens Comprehensive Testing Plan
**Date**: August 15, 2026
**Objective**: Test website scanning and GitHub scanning with real vulnerable test sites

## Test Environment
- **Backend Port**: 4000
- **Frontend Port**: 3000
- **Database**: PostgreSQL (localhost:5433)
- **Cache**: Redis (localhost:6380)

## Testing Phases

### Phase 1: Service Startup
- [ ] Verify PostgreSQL is running
- [ ] Verify Redis is running
- [ ] Start Backend NestJS server
- [ ] Start Frontend Next.js server
- [ ] Verify health endpoints

### Phase 2: Website Scanning Tests
**Real Vulnerable Test Sites Used**:
1. **DVWA (Damn Vulnerable Web App)** - http://dvwa.local or http://localhost:8000
   - SQL Injection vulnerabilities
   - XSS vulnerabilities
   - Command Injection
   - File Inclusion
   - CSRF attacks

2. **WebGoat** - http://localhost:8080/WebGoat
   - OWASP Top 10 vulnerabilities
   - Authentication issues
   - Authorization flaws

3. **HackTheBox - Juice Shop** - http://localhost:3001
   - e-commerce security vulnerabilities
   - API security issues
   - Information disclosure

4. **Mutillidae** - http://localhost/mutillidae
   - Multiple vulnerability types
   - Authentication/Authorization issues

**Scanning Tests**:
- [ ] Basic URL scan
- [ ] Nuclei template-based scanning
- [ ] SSL/TLS analysis
- [ ] Header analysis
- [ ] Technology detection
- [ ] Port scanning
- [ ] Subdomain enumeration
- [ ] Verify vulnerability detection accuracy

### Phase 3: GitHub Repository Scanning
**Test Repositories**:
1. Create a test GitHub repository with:
   - Secrets in code (API keys, tokens)
   - Vulnerable dependencies (known CVEs)
   - Code quality issues
   - Configuration files with sensitive data

2. Use public repositories with known issues:
   - Popular projects with disclosed vulnerabilities
   - Outdated dependencies

**Scanning Tests**:
- [ ] Connect GitHub OAuth or Personal Token
- [ ] Scan private repository
- [ ] Scan public repository
- [ ] Detect hardcoded secrets
- [ ] Identify vulnerable dependencies
- [ ] Analysis of code quality
- [ ] Generation of security report

### Phase 4: Dashboard Verification
- [ ] View scan results in dashboard
- [ ] Check vulnerability severity classification
- [ ] Verify finding correlation
- [ ] Check scan history/timeline
- [ ] Verify scan metadata

### Phase 5: Export & Reporting
- [ ] Export results as PDF
- [ ] Export results as JSON
- [ ] Export results as CSV
- [ ] Verify exported data completeness
- [ ] Check report formatting

### Phase 6: Performance & Reliability
- [ ] Concurrent scan execution
- [ ] Large target scanning (bulk URLs)
- [ ] Error handling for unreachable hosts
- [ ] Timeout handling
- [ ] Memory usage monitoring

## Expected Results

### Website Scanning
- Vulnerabilities detected per engine:
  - Nuclei: Template-based findings
  - SSL/TLS issues: Certificate validation
  - Header analysis: Security headers
  - Port scanning: Open ports
  - Technology detection: Framework/CMS identification

### GitHub Scanning
- Secrets found and reported
- Vulnerable dependencies identified
- Code quality metrics
- Risk score calculation

## Test Documentation
Results will be logged in:
- `/tmp/securelens-test-results-*.json`
- Dashboard screenshots
- Comprehensive test report

## Notes
- All tests use non-production, intentionally vulnerable test applications
- GitHub scanning requires valid credentials
- Some tests may require network connectivity
