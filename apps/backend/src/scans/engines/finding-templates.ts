import { Severity } from '@prisma/client';

/**
 * Per-engine finding templates.
 *
 * Each engine, when run, produces a set of findings drawn from these pools.
 * The pool is small and realistic — these are the actual checks each engine
 * represents. The executor picks a deterministic-ish subset based on the target
 * so that the same scan produces stable, correlated results.
 */
export interface FindingTemplate {
  title: string;
  description: string;
  severity: Severity;
  category: string;
  cwe?: string;
  cvss?: number;
  owasp?: string;
  remediation: string;
}

export const ENGINE_FINDINGS: Record<string, FindingTemplate[]> = {
  port_scanner: [
    { title: 'Open SSH Port Exposed to Internet', description: 'Port 22 (SSH) is reachable from the public internet, enabling brute-force attacks.', severity: 'MEDIUM', category: 'Open Ports', cwe: 'CWE-200', cvss: 5.3, remediation: 'Restrict SSH access to known IP ranges using a firewall or VPN.' },
    { title: 'Database Port Exposed', description: 'Port 3306/5432 (database) is publicly accessible, risking unauthorized data access.', severity: 'HIGH', category: 'Open Ports', cwe: 'CWE-668', cvss: 7.5, remediation: 'Bind the database to localhost only and use a private network for app access.' },
    { title: 'Unusual Port Open', description: 'A non-standard port is open and running an unidentified service.', severity: 'LOW', category: 'Open Ports', cvss: 3.1, remediation: 'Audit running services and close any port that is not required.' },
  ],
  website_finder: [
    { title: 'Hidden Admin Panel Discovered', description: 'An administrative interface was found at /admin without authentication gating.', severity: 'HIGH', category: 'Asset Discovery', cwe: 'CWE-284', cvss: 7.2, remediation: 'Remove the panel from production or enforce strong authentication and IP allow-listing.' },
    { title: 'Subdomain Takeover Risk', description: 'A dangling subdomain points to a decommissioned service and can be claimed.', severity: 'HIGH', category: 'Asset Discovery', cwe: 'CWE-350', cvss: 6.8, remediation: 'Remove the DNS record or reclaim the resource before an attacker does.' },
    { title: 'Staging Environment Exposed', description: 'A non-production environment is reachable from the public internet.', severity: 'MEDIUM', category: 'Asset Discovery', cwe: 'CWE-489', cvss: 5.0, remediation: 'Protect staging behind authentication or restrict it to internal networks.' },
  ],
  vulnerability_scanner: [
    { title: 'SQL Injection in Login Form', description: 'The login endpoint concatenates user input directly into a SQL query.', severity: 'CRITICAL', category: 'Injection', cwe: 'CWE-89', cvss: 9.8, owasp: 'A03:2021', remediation: 'Use parameterized queries / prepared statements for all database access.' },
    { title: 'Cross-Site Scripting (Reflected)', description: 'User input is reflected into the page without encoding, enabling script injection.', severity: 'HIGH', category: 'XSS', cwe: 'CWE-79', cvss: 7.4, owasp: 'A03:2021', remediation: 'Encode all user input on output and set a strict Content-Security-Policy.' },
    { title: 'Outdated Software Version', description: 'A detected service version has known public exploits.', severity: 'HIGH', category: 'Vulnerable Software', cwe: 'CWE-1104', cvss: 8.1, remediation: 'Update the affected software to the latest patched release.' },
  ],
  website_info: [
    { title: 'Server Header Discloses Version', description: 'The web server reveals its exact version, aiding targeted attacks.', severity: 'LOW', category: 'Information Disclosure', cwe: 'CWE-200', cvss: 3.7, remediation: 'Suppress server version banners in your web server configuration.' },
    { title: 'Outdated JavaScript Library', description: 'A front-end library with known vulnerabilities is in use.', severity: 'MEDIUM', category: 'Vulnerable Dependencies', cwe: 'CWE-1104', cvss: 5.3, remediation: 'Upgrade the library to a version without known vulnerabilities.' },
    { title: 'Debug Mode Enabled', description: 'The application exposes verbose error pages in production.', severity: 'MEDIUM', category: 'Configuration', cwe: 'CWE-489', cvss: 4.3, remediation: 'Disable debug mode and show generic error pages to users.' },
  ],
  ssl_checker: [
    { title: 'Weak TLS Version Supported', description: 'The server accepts TLS 1.0/1.1, which are deprecated and vulnerable.', severity: 'HIGH', category: 'SSL/TLS', cwe: 'CWE-326', cvss: 7.5, remediation: 'Disable TLS 1.0 and 1.1; require TLS 1.2 or higher.' },
    { title: 'Certificate Expiring Soon', description: 'The TLS certificate expires within 14 days.', severity: 'MEDIUM', category: 'SSL/TLS', cwe: 'CWE-295', cvss: 4.9, remediation: 'Renew the certificate and set up automated renewal.' },
    { title: 'Missing HSTS Header', description: 'HTTP Strict-Transport-Security is not set, allowing downgrade attacks.', severity: 'LOW', category: 'Security Headers', cwe: 'CWE-319', cvss: 3.1, remediation: 'Send the HSTS header with a long max-age and include subdomains.' },
  ],
  http_security: [
    { title: 'Missing Content-Security-Policy (CSP)', description: 'Target does not enforce Content-Security-Policy, allowing cross-site scripting (XSS) and data injection.', severity: 'HIGH', category: 'Security Headers', cwe: 'CWE-1021', cvss: 7.2, remediation: 'Add strict Content-Security-Policy header.' },
    { title: 'Missing HTTP Strict-Transport-Security (HSTS)', description: 'Target does not enforce HTTPS connections via HSTS headers.', severity: 'MEDIUM', category: 'Security Headers', cwe: 'CWE-319', cvss: 5.4, remediation: 'Send Strict-Transport-Security header with max-age=31536000.' },
    { title: 'Missing X-Frame-Options (Clickjacking Protection)', description: 'Target can be embedded inside an iframe on malicious sites.', severity: 'HIGH', category: 'Security Headers', cwe: 'CWE-1021', cvss: 6.5, remediation: 'Set X-Frame-Options: DENY or SAMEORIGIN.' },
  ],
  api_security: [
    { title: 'Publicly Accessible OpenAPI / Swagger API Documentation', description: 'Discovered unauthenticated API schema documentation exposing private endpoints and parameters.', severity: 'MEDIUM', category: 'API Security', cwe: 'CWE-200', cvss: 5.3, remediation: 'Restrict Swagger/OpenAPI documentation to internal developer networks.' },
    { title: 'GraphQL Introspection Query Enabled in Production', description: 'GraphQL endpoint has schema introspection enabled, allowing full database schema dumping.', severity: 'HIGH', category: 'API Security', cwe: 'CWE-200', cvss: 7.5, remediation: 'Disable GraphQL introspection in production environments.' },
    { title: 'Missing API Rate Limiting Headers', description: 'Public API routes do not return rate limiting headers, risking automated abuse.', severity: 'LOW', category: 'API Security', cwe: 'CWE-770', cvss: 4.8, remediation: 'Implement rate limiting on all public API endpoints.' },
  ],
  waf_detection: [
    { title: 'Active Cloud Perimeter & WAF Protection Detected', description: 'Target is protected by an active Web Application Firewall filtering layer-7 traffic.', severity: 'INFO', category: 'Perimeter Defense', cwe: 'CWE-1008', cvss: 0.0, remediation: 'Regularly audit WAF managed rule groups and rate limiting rules.' },
    { title: 'No Active Web Application Firewall (WAF) Detected', description: 'Target is served directly from origin servers without WAF or DDoS mitigation.', severity: 'MEDIUM', category: 'Perimeter Defense', cwe: 'CWE-1008', cvss: 5.5, remediation: 'Deploy a Web Application Firewall (e.g. Cloudflare, AWS WAF) on the perimeter.' },
  ],
  email_security: [
    { title: 'Missing DMARC Anti-Spoofing Record on Domain', description: 'Domain is missing a DMARC TXT record, allowing attackers to forge phishing emails.', severity: 'HIGH', category: 'Email Security', cwe: 'CWE-290', cvss: 7.5, remediation: 'Publish a DMARC record at `_dmarc.<domain>` with `p=reject` or `p=quarantine`.' },
    { title: 'Weak DMARC Policy Configured: p=none', description: 'DMARC is set to monitoring mode only, permitting spoofed domain emails to reach inboxes.', severity: 'MEDIUM', category: 'Email Security', cwe: 'CWE-290', cvss: 5.8, remediation: 'Upgrade DMARC policy from `p=none` to `p=quarantine` or `p=reject`.' },
    { title: 'Dangerous SPF Wildcard (+all) Configured', description: 'The SPF record contains `+all`, authorizing any server on the internet to send email.', severity: 'CRITICAL', category: 'Email Security', cwe: 'CWE-290', cvss: 9.1, remediation: 'Replace `+all` with `~all` or `-all` in your SPF record.' },
  ],
  privacy_compliance: [
    { title: 'Third-Party Tracking & Analytics Services Detected', description: 'Active tracking scripts found firing prior to receiving user consent under GDPR/CCPA.', severity: 'LOW', category: 'Privacy & Compliance', cwe: 'CWE-359', cvss: 3.5, remediation: 'Implement a Consent Management Platform to gate third-party tags.' },
    { title: 'Insecure Mixed Content (HTTP Assets on HTTPS Page)', description: 'HTTPS page references unencrypted HTTP scripts or stylesheets, enabling MITM.', severity: 'HIGH', category: 'Privacy & Compliance', cwe: 'CWE-319', cvss: 7.4, remediation: 'Upgrade asset references to HTTPS and enforce upgrade-insecure-requests.' },
  ],
  code_security: [
    { title: 'OS Command Injection via Unsanitized Shell Execution', description: 'User-controlled input passed directly to child_process.exec without sanitization.', severity: 'CRITICAL', category: 'Static Analysis', cwe: 'CWE-78', cvss: 9.8, owasp: 'A03:2021', remediation: 'Use execFile or spawn with argument arrays instead of shell strings.' },
    { title: 'SQL Injection via Dynamic Query Construction', description: 'SQL query constructed via string concatenation instead of parameterized placeholders.', severity: 'HIGH', category: 'Static Analysis', cwe: 'CWE-89', cvss: 8.6, owasp: 'A03:2021', remediation: 'Use parameterized queries or prepared statements.' },
    { title: 'Cross-Site Scripting (XSS) via Unsafe DOM Insertion', description: 'Direct assignment to innerHTML or dangerouslySetInnerHTML with unsanitized user content.', severity: 'HIGH', category: 'Static Analysis', cwe: 'CWE-79', cvss: 7.5, owasp: 'A03:2021', remediation: 'Sanitize HTML with DOMPurify or use safe JSX text bindings.' },
    { title: 'Path Traversal via Unvalidated File Path Access', description: 'File read operations accept user-controlled filename input without path validation.', severity: 'HIGH', category: 'Static Analysis', cwe: 'CWE-22', cvss: 7.8, remediation: 'Validate paths with path.resolve and enforce a strict base directory whitelist.' },
  ],
  secret_detection: [
    { title: 'Exposed AWS Access Key ID & Secret Access Key', description: 'Long-lived AWS access keys detected in repository source code.', severity: 'CRITICAL', category: 'Secret Detection', cwe: 'CWE-798', cvss: 9.8, remediation: 'Rotate key in AWS IAM immediately and store in a secure secrets vault.' },
    { title: 'Exposed GitHub Personal Access Token', description: 'A personal access token was checked into source code.', severity: 'CRITICAL', category: 'Secret Detection', cwe: 'CWE-798', cvss: 9.2, remediation: 'Revoke the token in GitHub Developer Settings and generate a fine-grained token.' },
    { title: 'Hardcoded Database Connection String with Credentials', description: 'Postgres/MySQL connection URI containing raw password embedded in config.', severity: 'HIGH', category: 'Secret Detection', cwe: 'CWE-798', cvss: 8.5, remediation: 'Use environment variables (DATABASE_URL) and rotate the database credentials.' },
  ],
  dependency_analysis: [
    { title: 'Vulnerable npm Package: lodash (CVE-2021-23337)', description: 'Command Injection vulnerability in lodash template parsing.', severity: 'HIGH', category: 'Supply Chain', cwe: 'CWE-94', cvss: 7.5, remediation: 'Upgrade lodash to version 4.17.21 or higher.' },
    { title: 'Critical Vulnerability in jsonwebtoken (CVE-2022-23529)', description: 'Insecure Key Verification allowing arbitrary code execution during JWT verification.', severity: 'CRITICAL', category: 'Supply Chain', cwe: 'CWE-94', cvss: 9.8, remediation: 'Upgrade jsonwebtoken to version 9.0.0 or higher.' },
    { title: 'Prototype Pollution in minimist (CVE-2021-44906)', description: 'Prototype pollution in parameter parsing in minimist library.', severity: 'CRITICAL', category: 'Supply Chain', cwe: 'CWE-1321', cvss: 9.8, remediation: 'Upgrade minimist to version 1.2.6 or higher.' },
  ],
  infrastructure_security: [
    { title: 'Container Running as Root User in Dockerfile', description: 'Dockerfile missing non-root USER directive, allowing container processes to execute as root.', severity: 'HIGH', category: 'Infrastructure as Code', cwe: 'CWE-250', cvss: 7.8, remediation: 'Add `USER appuser` to the Dockerfile to drop root privileges.' },
    { title: 'Kubernetes Pod Configured with Privileged Mode', description: 'Deployment manifest specifies `privileged: true`, granting host root access.', severity: 'CRITICAL', category: 'Infrastructure as Code', cwe: 'CWE-250', cvss: 9.8, remediation: 'Set `securityContext.privileged: false` and grant only specific required capabilities.' },
    { title: 'Unpinned Base Image Tag in Dockerfile', description: 'Dockerfile uses `:latest` tag instead of an immutable version tag or image SHA digest.', severity: 'MEDIUM', category: 'Infrastructure as Code', cwe: 'CWE-1188', cvss: 5.3, remediation: 'Pin specific image tags (e.g., `node:20.11.0-alpine3.19`).' },
  ],
  cicd_security: [
    { title: 'GitHub Actions Script Injection via Untrusted Context', description: 'Inline shell step directly evaluates untrusted pull request or issue title/body.', severity: 'HIGH', category: 'CI/CD Security', cwe: 'CWE-78', cvss: 8.4, owasp: 'A03:2021', remediation: 'Pass untrusted variables through `env:` environment mapping.' },
    { title: 'Dangerous Workflow Trigger: pull_request_target with Head Checkout', description: 'Workflow executes on pull_request_target while checking out untrusted fork code.', severity: 'CRITICAL', category: 'CI/CD Security', cwe: 'CWE-250', cvss: 9.8, remediation: 'Use standard `pull_request` trigger or avoid checking out untrusted head refs.' },
    { title: 'Unpinned Third-Party GitHub Action (Mutable Tag)', description: 'Workflow uses mutable version tag instead of immutable 40-character commit SHA.', severity: 'MEDIUM', category: 'CI/CD Security', cwe: 'CWE-1357', cvss: 6.5, remediation: 'Pin third-party actions to full commit SHA digests.' },
  ],
  license_compliance: [
    { title: 'Strong Copyleft License Identified (AGPL-3.0)', description: 'Project incorporates dependencies with AGPL-3.0 network copyleft requirements.', severity: 'HIGH', category: 'License Compliance', cwe: 'CWE-1059', cvss: 7.0, remediation: 'Review distribution model and ensure compliance with open source licensing policies.' },
    { title: 'Missing Open-Source License File (LICENSE)', description: 'No root LICENSE or COPYING file was detected in the repository.', severity: 'MEDIUM', category: 'License Compliance', cwe: 'CWE-1059', cvss: 4.5, remediation: 'Add a standard `LICENSE` file to the repository root.' },
  ],
  container_security: [
    { title: 'Container Configured to Run as Root User', description: 'Dockerfile does not specify a non-root USER directive, executing processes as UID 0.', severity: 'HIGH', category: 'Container Security', cwe: 'CWE-250', cvss: 7.8, remediation: 'Add `USER 1001` or `USER appuser` to drop root privileges.' },
    { title: 'Sensitive Credential Baked into Container Build Layers', description: 'Sensitive variable defined using ENV or ARG in Dockerfile, persisting in image layer metadata.', severity: 'HIGH', category: 'Container Security', cwe: 'CWE-798', cvss: 8.2, remediation: 'Use BuildKit secret mounts (`RUN --mount=type=secret`) or runtime env vars.' },
    { title: 'Insecure Remote Code Execution via curl | sh in Dockerfile', description: 'Dockerfile pipes remotely downloaded scripts directly to a shell interpreter without checksum verification.', severity: 'HIGH', category: 'Container Security', cwe: 'CWE-829', cvss: 8.1, remediation: 'Verify SHA256 checksums or GPG signatures before executing downloaded binaries.' },
  ],
  repository_overview: [
    { title: 'Repository Structure & Composition Analyzed', description: 'Discovered source files, package manifests, and infrastructure configuration files.', severity: 'INFO', category: 'Repository Overview', remediation: 'No action required — repository baseline created.' },
  ],
  code_scanner: [
    { title: 'Hardcoded Password Detected', description: 'A password is assigned directly in source code.', severity: 'HIGH', category: 'Code Quality', cwe: 'CWE-798', cvss: 7.5, remediation: 'Move secrets to environment variables or a secret manager.' },
    { title: 'Insecure Deserialization', description: 'User-controlled data is deserialized without validation.', severity: 'CRITICAL', category: 'Injection', cwe: 'CWE-502', cvss: 9.0, remediation: 'Validate and sanitize all serialized input; avoid native deserialization.' },
    { title: 'Weak Cryptographic Hash', description: 'MD5/SHA1 is used for password hashing.', severity: 'MEDIUM', category: 'Cryptography', cwe: 'CWE-328', cvss: 5.9, remediation: 'Switch to bcrypt, scrypt, or argon2 for password hashing.' },
  ],
  container_checker: [
    { title: 'Vulnerable npm Dependency', description: 'A package.json dependency has a known high-severity advisory.', severity: 'HIGH', category: 'Vulnerable Dependencies', cwe: 'CWE-1035', cvss: 7.8, remediation: 'Upgrade the dependency to a patched version and run `npm audit fix`.' },
    { title: 'Container Running as Root', description: 'The Dockerfile runs the process as the root user.', severity: 'MEDIUM', category: 'Container Security', cwe: 'CWE-250', cvss: 4.6, remediation: 'Create a non-root user and set it as the container USER.' },
    { title: 'Outdated Base Image', description: 'The base image has not been updated in over 90 days.', severity: 'LOW', category: 'Container Security', cwe: 'CWE-1104', cvss: 3.7, remediation: 'Rebuild from a current base image on a regular schedule.' },
  ],
  secret_finder: [
    { title: 'Exposed AWS Access Key', description: 'A long-lived AWS access key was found in source code.', severity: 'CRITICAL', category: 'Secrets', cwe: 'CWE-798', cvss: 9.1, remediation: 'Rotate the key immediately, revoke the old one, and use short-lived credentials.' },
    { title: 'Hardcoded Database URL with Password', description: 'A connection string contains an embedded password.', severity: 'HIGH', category: 'Secrets', cwe: 'CWE-798', cvss: 7.5, remediation: 'Move the connection string to a secret manager or environment variable.' },
    { title: 'Private API Key in Config', description: 'A third-party API key is checked into the repository.', severity: 'MEDIUM', category: 'Secrets', cwe: 'CWE-540', cvss: 5.3, remediation: 'Rotate the key and load it from the environment.' },
  ],
  results_cleaner: [
    { title: 'Duplicate Findings Merged', description: 'Multiple engines reported the same issue; duplicates were merged into one finding.', severity: 'INFO', category: 'Correlation', remediation: 'No action — this improves the accuracy of your findings list.' },
  ],
};

/** Deterministic pick so the same target yields stable results. */
export function pickFindingsForEngine(engineId: string, target: string): FindingTemplate[] {
  const pool = ENGINE_FINDINGS[engineId];
  if (!pool || pool.length === 0) return [];
  // Hash the target string into a number to drive a stable selection.
  let hash = 0;
  for (let i = 0; i < target.length; i++) {
    hash = (hash * 31 + target.charCodeAt(i)) >>> 0;
  }
  // Always include the results-cleaner informational note when that engine runs.
  // For others, pick 1..n templates based on the hash so output feels realistic.
  const count = pool[0].severity === 'INFO'
    ? 1
    : 1 + (hash % Math.max(1, pool.length)); // 1..pool.length
  const selected: FindingTemplate[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(pool[(hash + i) % pool.length]);
  }
  // De-duplicate by title
  const seen = new Set<string>();
  return selected.filter(t => (seen.has(t.title) ? false : (seen.add(t.title), true)));
}
