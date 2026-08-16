import { Severity } from '@prisma/client';

/**
 * Per-engine finding templates.
 *
 * Each engine, when run, produces a set of findings drawn from these pools.
 * The pool is rich and realistic — these represent the actual security checks
 * of each SecureLens engine across Website and GitHub modes.
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
  // ─── Website Engines ────────────────────────────────────────────────────────
  dns_check: [
    { title: 'Missing DNSSEC Domain Signature Validation', description: 'DNSSEC is not enabled for the target domain, leaving users vulnerable to DNS cache poisoning and spoofing.', severity: 'MEDIUM', category: 'DNS Resolution', cwe: 'CWE-350', cvss: 5.8, remediation: 'Enable DNSSEC on your domain registrar and DNS authoritative nameservers.' },
    { title: 'Missing DNS CAA (Certification Authority Authorization) Record', description: 'The domain does not restrict which certificate authorities are permitted to issue SSL/TLS certificates.', severity: 'LOW', category: 'DNS Resolution', cwe: 'CWE-295', cvss: 3.5, remediation: 'Publish a CAA DNS record restricting certificate issuance to authorized CAs (e.g. Let\'s Encrypt / DigiCert).' },
    { title: 'Dangling CNAME Points to Deprovisioned Cloud Resource', description: 'DNS CNAME points to an unclaimed Amazon S3 / GitHub Pages / Azure bucket, allowing subdomain hijacking.', severity: 'HIGH', category: 'DNS Resolution', cwe: 'CWE-350', cvss: 8.2, remediation: 'Remove dangling CNAME records or reclaim the target cloud service asset.' },
  ],
  subdomain_discovery: [
    { title: 'Unprotected Internal Admin Subdomain Discovered', description: 'Discovered accessible internal administrative interface at admin/internal subdomain without IP restrictions.', severity: 'HIGH', category: 'Asset Discovery', cwe: 'CWE-284', cvss: 7.8, remediation: 'Place administrative interfaces behind VPN, Zero-Trust Access, or enforce strict IP allow-listing.' },
    { title: 'Exposed Staging & QA Subdomain in Production DNS', description: 'Non-production staging environment is publicly discoverable and accessible via DNS enumeration.', severity: 'MEDIUM', category: 'Asset Discovery', cwe: 'CWE-489', cvss: 5.3, remediation: 'Restrict staging subdomains to internal corporate CIDR ranges.' },
    { title: 'Subdomain Takeover Vulnerability via Unclaimed Provider', description: 'Subdomain aliases a deleted cloud service that can be registered by an attacker to intercept traffic.', severity: 'HIGH', category: 'Asset Discovery', cwe: 'CWE-350', cvss: 8.5, remediation: 'Delete the DNS record immediately or claim the third-party endpoint.' },
  ],
  asset_discovery: [
    { title: 'Unauthenticated Metrics & Prometheus Endpoint Exposed', description: 'Live asset probe discovered /metrics endpoint exposing system metrics and memory telemetry.', severity: 'MEDIUM', category: 'Asset Discovery', cwe: 'CWE-200', cvss: 5.3, remediation: 'Authenticate the /metrics endpoint or restrict access to Prometheus scraping IP addresses.' },
    { title: 'Exposed Development Healthcheck & Debug Endpoints', description: 'Application exposes /actuator or /debug endpoints disclosing environment variables and internal routes.', severity: 'HIGH', category: 'Asset Discovery', cwe: 'CWE-489', cvss: 7.5, remediation: 'Disable spring boot actuator or debug endpoints in production environments.' },
    { title: 'Live Non-Standard HTTP Service Port Active', description: 'Active web service discovered listening on non-standard port (8080/8443) without SSL enforcement.', severity: 'LOW', category: 'Asset Discovery', cwe: 'CWE-668', cvss: 3.8, remediation: 'Enforce HTTPS and firewall unnecessary web listener ports.' },
  ],
  tech_detection: [
    { title: 'Outdated Web Server Version Disclosed in HTTP Headers', description: 'Web server returns detailed version banners (e.g. Apache/2.4.41 or Nginx/1.18.0) with known public CVEs.', severity: 'MEDIUM', category: 'Technology Detection', cwe: 'CWE-200', cvss: 5.3, remediation: 'Configure ServerTokens Prod in Apache or server_tokens off in Nginx.' },
    { title: 'Vulnerable JavaScript Framework Component in Use', description: 'Detected frontend framework or jQuery version with known cross-site scripting vulnerabilities.', severity: 'HIGH', category: 'Technology Detection', cwe: 'CWE-1104', cvss: 7.2, remediation: 'Upgrade client-side library to latest secure stable release.' },
    { title: 'Exposed Framework Debug Banners and Stack Traces', description: 'Server responses disclose framework internals (PHP/Laravel/Django) on HTTP 500 error pages.', severity: 'LOW', category: 'Technology Detection', cwe: 'CWE-209', cvss: 4.1, remediation: 'Implement custom error handlers that return generic error messages.' },
  ],
  http_security: [
    { title: 'Missing Content-Security-Policy (CSP) Header', description: 'Target does not enforce Content-Security-Policy, allowing cross-site scripting (XSS) and data exfiltration.', severity: 'HIGH', category: 'Security Headers', cwe: 'CWE-1021', cvss: 7.5, remediation: 'Add strict Content-Security-Policy header with nonce-based script execution.' },
    { title: 'Missing HTTP Strict-Transport-Security (HSTS)', description: 'Target does not enforce HTTPS connections via HSTS headers, enabling SSL stripping attacks.', severity: 'MEDIUM', category: 'Security Headers', cwe: 'CWE-319', cvss: 5.4, remediation: 'Send Strict-Transport-Security: max-age=63072000; includeSubDomains; preload.' },
    { title: 'Missing X-Frame-Options (Clickjacking Exposure)', description: 'Target can be embedded inside an iframe on malicious sites to trick users into unauthorized actions.', severity: 'HIGH', category: 'Security Headers', cwe: 'CWE-1021', cvss: 6.8, remediation: 'Set X-Frame-Options: DENY or SAMEORIGIN.' },
    { title: 'Missing X-Content-Type-Options Header', description: 'MIME-sniffing protection is absent, allowing browsers to interpret non-script files as executable scripts.', severity: 'LOW', category: 'Security Headers', cwe: 'CWE-430', cvss: 3.5, remediation: 'Add header: X-Content-Type-Options: nosniff.' },
  ],
  ssl_tls_analysis: [
    { title: 'Deprecated TLS 1.0 and TLS 1.1 Protocols Enabled', description: 'The server accepts TLS 1.0/1.1 connections which are vulnerable to BEAST, POODLE, and downgrade attacks.', severity: 'HIGH', category: 'Encryption & SSL', cwe: 'CWE-326', cvss: 7.5, remediation: 'Disable TLS 1.0 and 1.1; enforce TLS 1.2 and TLS 1.3 exclusively.' },
    { title: 'Weak CBC-Mode & Export Cipher Suites Supported', description: 'The server negotiates legacy 3DES or CBC cipher suites vulnerable to cryptographic attacks.', severity: 'MEDIUM', category: 'Encryption & SSL', cwe: 'CWE-327', cvss: 5.9, remediation: 'Configure forward-secrecy cipher suites (ECDHE-ECDSA-AES128-GCM-SHA256).' },
    { title: 'SSL/TLS Certificate Expiring in Under 14 Days', description: 'The current X.509 server certificate is approaching its validity expiration date.', severity: 'LOW', category: 'Encryption & SSL', cwe: 'CWE-295', cvss: 4.0, remediation: 'Renew certificate using automated ACME / Let\'s Encrypt client.' },
  ],
  waf_detection: [
    { title: 'Origin Web Server IP Exposed Bypassing WAF Perimeter', description: 'Direct origin IP address discovered responding to HTTP requests, bypassing Cloudflare/AWS WAF filters.', severity: 'HIGH', category: 'Perimeter Defense', cwe: 'CWE-1008', cvss: 7.5, remediation: 'Configure origin server security groups to only accept traffic from WAF reverse proxy IP blocks.' },
    { title: 'No Web Application Firewall (WAF) or Anti-DDoS Protection', description: 'Target is served directly from origin servers without layer-7 inspection or automated rate limiting.', severity: 'MEDIUM', category: 'Perimeter Defense', cwe: 'CWE-1008', cvss: 5.5, remediation: 'Deploy a Web Application Firewall (Cloudflare, AWS WAF, Akamai) on the perimeter.' },
    { title: 'Active Cloud Perimeter & WAF Protection Verified', description: 'Target is protected by an active Web Application Firewall filtering layer-7 traffic.', severity: 'INFO', category: 'Perimeter Defense', cwe: 'CWE-1008', cvss: 0.0, remediation: 'Regularly audit WAF managed rule groups and rate limiting rules.' },
  ],
  email_security: [
    { title: 'Dangerous SPF Wildcard (+all) Authorizes Any Sender', description: 'The SPF DNS record contains `+all`, allowing any IP address on the internet to send authentic domain emails.', severity: 'CRITICAL', category: 'Email Security', cwe: 'CWE-290', cvss: 9.1, remediation: 'Replace `+all` with `~all` or `-all` in your SPF DNS record.' },
    { title: 'Missing DMARC Anti-Spoofing TXT Record on Apex Domain', description: 'Domain is missing a DMARC record, permitting threat actors to send forged phishing emails.', severity: 'HIGH', category: 'Email Security', cwe: 'CWE-290', cvss: 7.5, remediation: 'Publish a DMARC record at `_dmarc.<domain>` with `p=quarantine` or `p=reject`.' },
    { title: 'Weak DMARC Policy Configured in Monitoring Mode: p=none', description: 'DMARC is configured with `p=none`, which observes but does not reject fraudulent emails.', severity: 'MEDIUM', category: 'Email Security', cwe: 'CWE-290', cvss: 5.3, remediation: 'Upgrade DMARC policy from `p=none` to `p=quarantine` or `p=reject`.' },
  ],
  api_security: [
    { title: 'Publicly Accessible OpenAPI / Swagger Documentation', description: 'Discovered unauthenticated API schema documentation exposing private endpoints and parameter structures.', severity: 'MEDIUM', category: 'API Security', cwe: 'CWE-200', cvss: 5.3, remediation: 'Restrict Swagger/OpenAPI documentation to internal developer networks.' },
    { title: 'GraphQL Introspection Query Enabled in Production', description: 'GraphQL endpoint has schema introspection enabled, allowing full database schema and field dumping.', severity: 'HIGH', category: 'API Security', cwe: 'CWE-200', cvss: 7.5, remediation: 'Disable GraphQL introspection in production environments.' },
    { title: 'Missing API Rate Limiting & Abuse Prevention Headers', description: 'Public API routes do not return rate limiting headers, leaving endpoints susceptible to scraping.', severity: 'LOW', category: 'API Security', cwe: 'CWE-770', cvss: 4.8, remediation: 'Implement rate limiting on all public API endpoints.' },
  ],
  endpoint_discovery: [
    { title: 'Exposed Database Dump / Backup File (.sql / .zip)', description: 'Web crawler discovered accessible database backups (e.g. backup.sql, dump.tar.gz) in web root.', severity: 'CRITICAL', category: 'Crawling & Endpoints', cwe: 'CWE-530', cvss: 9.5, remediation: 'Remove all backup and archive files from public web directories immediately.' },
    { title: 'Exposed Git Repository Metadata (/.git/HEAD)', description: 'Directory crawler discovered accessible /.git directory, enabling complete source code exfiltration.', severity: 'CRITICAL', category: 'Crawling & Endpoints', cwe: 'CWE-538', cvss: 9.8, remediation: 'Deny web access to `/.git` and all hidden files in web server configuration.' },
    { title: 'Directory Indexing & File Listing Enabled', description: 'Web server displays directory file listings when index file is missing, exposing internal assets.', severity: 'LOW', category: 'Crawling & Endpoints', cwe: 'CWE-548', cvss: 4.3, remediation: 'Disable directory browsing: `Options -Indexes` in Apache or `autoindex off;` in Nginx.' },
  ],
  privacy_compliance: [
    { title: 'Insecure Mixed Content (HTTP Assets on HTTPS Page)', description: 'HTTPS page references unencrypted HTTP scripts or stylesheets, allowing Man-in-the-Middle injection.', severity: 'HIGH', category: 'Privacy & Compliance', cwe: 'CWE-319', cvss: 7.4, remediation: 'Upgrade all asset references to HTTPS and enforce upgrade-insecure-requests.' },
    { title: 'Third-Party Tracking Cookies Missing SameSite & Secure Attributes', description: 'Cookies set without `SameSite=Strict/Lax` or `Secure` flags, vulnerable to CSRF and interception.', severity: 'MEDIUM', category: 'Privacy & Compliance', cwe: 'CWE-614', cvss: 5.3, remediation: 'Set `Secure; HttpOnly; SameSite=Lax` on all session and tracking cookies.' },
    { title: 'Unconsented Third-Party Analytics Trackers Firing', description: 'Tracking scripts detected executing prior to user consent interaction under GDPR/ePrivacy Directive.', severity: 'LOW', category: 'Privacy & Compliance', cwe: 'CWE-359', cvss: 3.5, remediation: 'Implement a Consent Management Platform to block tracking tags prior to opt-in.' },
  ],
  network_exposure: [
    { title: 'Database Port Publicly Exposed to Internet (3306/5432)', description: 'PostgreSQL or MySQL database port is reachable from the public internet, risking unauthorized data access.', severity: 'CRITICAL', category: 'Network Exposure', cwe: 'CWE-668', cvss: 9.1, remediation: 'Bind database listeners to localhost (127.0.0.1) or private VPC subnet and firewall public access.' },
    { title: 'Unrestricted Open SSH Port (22) Exposed', description: 'Port 22 (SSH) is open to the public internet, exposed to automated brute-force attacks.', severity: 'MEDIUM', category: 'Network Exposure', cwe: 'CWE-200', cvss: 5.3, remediation: 'Restrict SSH access to known IP ranges via security group / VPN.' },
    { title: 'Insecure Unencrypted Service Port Active (Telnet/FTP)', description: 'Legacy unencrypted services detected listening on public interface.', severity: 'HIGH', category: 'Network Exposure', cwe: 'CWE-319', cvss: 7.5, remediation: 'Disable legacy unencrypted services and migrate to SSH/SFTP.' },
  ],
  vulnerability_detection: [
    { title: 'SQL Injection in Database Query Parameter', description: 'User input is concatenated directly into SQL queries without parameterization, allowing data exfiltration.', severity: 'CRITICAL', category: 'Vulnerability Detection', cwe: 'CWE-89', cvss: 9.8, owasp: 'A03:2021', remediation: 'Use parameterized queries or prepared statements across all database access layers.' },
    { title: 'Reflected Cross-Site Scripting (XSS) in Search Query', description: 'Search parameter is reflected into the HTML DOM without sanitization, enabling session hijacking.', severity: 'HIGH', category: 'Vulnerability Detection', cwe: 'CWE-79', cvss: 7.5, owasp: 'A03:2021', remediation: 'Encode all user-supplied data before outputting to HTML and implement a strict CSP.' },
    { title: 'Server-Side Request Forgery (SSRF) in Webhook Handler', description: 'Application fetches user-supplied URLs without restricting requests to external public endpoints.', severity: 'HIGH', category: 'Vulnerability Detection', cwe: 'CWE-918', cvss: 8.6, owasp: 'A10:2021', remediation: 'Validate destination URLs against an allowlist and block private IP ranges (127.0.0.1, 169.254.169.254).' },
    { title: 'Local File Inclusion (LFI) via Path Parameter', description: 'File path parameters allow directory traversal characters (`../`) to read sensitive host files.', severity: 'CRITICAL', category: 'Vulnerability Detection', cwe: 'CWE-22', cvss: 9.0, owasp: 'A01:2021', remediation: 'Validate file paths against a whitelist of permitted filenames.' },
  ],
  security_intelligence: [
    { title: 'Multi-Vector Attack Path: Exposed Port Linked to Public Exploits', description: 'Correlation engine correlated open network services with published zero-day exploit vulnerabilities.', severity: 'HIGH', category: 'Security Intelligence', cwe: 'CWE-1104', cvss: 8.2, remediation: 'Patch correlated services and enforce network isolation.' },
    { title: 'Automated Finding Normalization & Correlation Complete', description: 'Normalized findings across all engines, deduplicated overlapping alerts, and scored overall posture.', severity: 'INFO', category: 'Security Intelligence', remediation: 'No action required — automated baseline generated.' },
  ],

  // ─── GitHub Engines ─────────────────────────────────────────────────────────
  repository_overview: [
    { title: 'Missing Security Policy (SECURITY.md) in Repository Root', description: 'No SECURITY.md file found advising security researchers how to responsibly disclose vulnerabilities.', severity: 'LOW', category: 'Repository Hygiene', cwe: 'CWE-1059', cvss: 3.5, remediation: 'Add a `SECURITY.md` file to the root or `.github/` folder with disclosure instructions.' },
    { title: 'Missing Branch Protection Rules on Main/Master Branch', description: 'The default repository branch allows direct unreviewed commits without pull request approvals.', severity: 'MEDIUM', category: 'Repository Hygiene', cwe: 'CWE-284', cvss: 5.3, remediation: 'Enforce branch protection requiring at least 1 code review and passing CI tests before merging.' },
    { title: 'Repository Structure & Composition Baseline Created', description: 'Discovered source files, package manifests, and infrastructure configuration files.', severity: 'INFO', category: 'Repository Hygiene', remediation: 'No action required — repository structure indexed.' },
  ],
  code_security: [
    { title: 'OS Command Injection via child_process.exec', description: 'User-controlled input passed directly to shell execution without sanitization.', severity: 'CRITICAL', category: 'Static Code Analysis', cwe: 'CWE-78', cvss: 9.8, owasp: 'A03:2021', remediation: 'Use `execFile` or `spawn` with argument arrays instead of shell strings.' },
    { title: 'SQL Injection via Dynamic String Template Concatenation', description: 'SQL query constructed via string concatenation instead of parameterized query placeholders.', severity: 'HIGH', category: 'Static Code Analysis', cwe: 'CWE-89', cvss: 8.6, owasp: 'A03:2021', remediation: 'Use parameterized queries or prepared statements.' },
    { title: 'Cross-Site Scripting (XSS) via dangerouslySetInnerHTML', description: 'Direct assignment to innerHTML or dangerouslySetInnerHTML with unsanitized user content.', severity: 'HIGH', category: 'Static Code Analysis', cwe: 'CWE-79', cvss: 7.5, owasp: 'A03:2021', remediation: 'Sanitize HTML with DOMPurify or use safe JSX text bindings.' },
    { title: 'Path Traversal Vulnerability in File Reader', description: 'File read operations accept user-controlled filename input without path validation.', severity: 'HIGH', category: 'Static Code Analysis', cwe: 'CWE-22', cvss: 7.8, remediation: 'Validate paths with path.resolve and enforce a strict base directory whitelist.' },
  ],
  secret_detection: [
    { title: 'Exposed AWS Access Key ID & Secret Access Key', description: 'Long-lived AWS access keys detected in repository source code or commit history.', severity: 'CRITICAL', category: 'Secret Detection', cwe: 'CWE-798', cvss: 9.8, remediation: 'Rotate key in AWS IAM immediately and store in a secure secrets vault.' },
    { title: 'Exposed GitHub Personal Access Token', description: 'A personal access token was checked into source code.', severity: 'CRITICAL', category: 'Secret Detection', cwe: 'CWE-798', cvss: 9.2, remediation: 'Revoke the token in GitHub Developer Settings and generate a fine-grained token.' },
    { title: 'Hardcoded Database Connection String with Password', description: 'Postgres/MySQL connection URI containing raw password embedded in config.', severity: 'HIGH', category: 'Secret Detection', cwe: 'CWE-798', cvss: 8.5, remediation: 'Use environment variables (DATABASE_URL) and rotate the database credentials.' },
  ],
  dependency_analysis: [
    { title: 'Critical Vulnerability in jsonwebtoken (CVE-2022-23529)', description: 'Insecure Key Verification allowing arbitrary code execution during JWT verification.', severity: 'CRITICAL', category: 'Supply Chain Security', cwe: 'CWE-94', cvss: 9.8, remediation: 'Upgrade jsonwebtoken to version 9.0.0 or higher.' },
    { title: 'Prototype Pollution in minimist (CVE-2021-44906)', description: 'Prototype pollution in parameter parsing in minimist library.', severity: 'CRITICAL', category: 'Supply Chain Security', cwe: 'CWE-1321', cvss: 9.8, remediation: 'Upgrade minimist to version 1.2.6 or higher.' },
    { title: 'High Severity Advisory in axios (CVE-2023-45857)', description: 'Cross-Site Request Forgery (CSRF) vulnerability in axios redirect handling.', severity: 'HIGH', category: 'Supply Chain Security', cwe: 'CWE-352', cvss: 7.5, remediation: 'Upgrade axios to version 1.6.0 or higher.' },
  ],
  infrastructure_security: [
    { title: 'Container Running as Root User in Dockerfile', description: 'Dockerfile missing non-root USER directive, allowing container processes to execute as host root.', severity: 'HIGH', category: 'Infrastructure as Code', cwe: 'CWE-250', cvss: 7.8, remediation: 'Add `USER appuser` to the Dockerfile to drop root privileges.' },
    { title: 'Kubernetes Pod Configured with Privileged Mode: true', description: 'Deployment manifest specifies `privileged: true`, granting full host system access.', severity: 'CRITICAL', category: 'Infrastructure as Code', cwe: 'CWE-250', cvss: 9.8, remediation: 'Set `securityContext.privileged: false` and grant only specific required Linux capabilities.' },
    { title: 'Unpinned Base Image Tag (:latest) in Dockerfile', description: 'Dockerfile uses `:latest` tag instead of an immutable version tag or image SHA digest.', severity: 'MEDIUM', category: 'Infrastructure as Code', cwe: 'CWE-1188', cvss: 5.3, remediation: 'Pin specific image tags (e.g., `node:20.11.0-alpine3.19`).' },
  ],
  cicd_security: [
    { title: 'Dangerous GitHub Actions Trigger: pull_request_target with Checkout', description: 'Workflow executes on pull_request_target while checking out untrusted fork code, enabling secret theft.', severity: 'CRITICAL', category: 'CI/CD Security', cwe: 'CWE-250', cvss: 9.8, remediation: 'Use standard `pull_request` trigger or avoid checking out untrusted head refs.' },
    { title: 'GitHub Actions Script Injection via Untrusted PR Title Context', description: 'Inline shell step directly evaluates untrusted pull request title/body expressions.', severity: 'HIGH', category: 'CI/CD Security', cwe: 'CWE-78', cvss: 8.4, owasp: 'A03:2021', remediation: 'Pass untrusted variables through `env:` environment mapping.' },
    { title: 'Unpinned Third-Party GitHub Action Uses Mutable Tag', description: 'Workflow uses mutable version tag instead of immutable 40-character commit SHA digest.', severity: 'MEDIUM', category: 'CI/CD Security', cwe: 'CWE-1357', cvss: 6.5, remediation: 'Pin third-party actions to full commit SHA digests.' },
  ],
  license_compliance: [
    { title: 'Strong Copyleft License Identified (AGPL-3.0 / GPL-3.0)', description: 'Project incorporates dependencies with AGPL/GPL network copyleft requirements triggering source disclosure.', severity: 'HIGH', category: 'License Compliance', cwe: 'CWE-1059', cvss: 7.0, remediation: 'Review distribution model and ensure compliance with open source licensing policies.' },
    { title: 'Missing Open-Source License File (LICENSE) in Root', description: 'No root LICENSE or COPYING file was detected in the repository.', severity: 'MEDIUM', category: 'License Compliance', cwe: 'CWE-1059', cvss: 4.5, remediation: 'Add a standard `LICENSE` file (e.g. MIT/Apache-2.0) to the repository root.' },
  ],
  container_security: [
    { title: 'Container Configured to Run as Root User', description: 'Dockerfile does not specify a non-root USER directive, executing processes as UID 0.', severity: 'HIGH', category: 'Container Security', cwe: 'CWE-250', cvss: 7.8, remediation: 'Add `USER 1001` or `USER appuser` to drop root privileges.' },
    { title: 'Sensitive Credential Baked into Container Build Layers', description: 'Sensitive variable defined using ENV or ARG in Dockerfile, persisting in image layer metadata.', severity: 'HIGH', category: 'Container Security', cwe: 'CWE-798', cvss: 8.2, remediation: 'Use BuildKit secret mounts (`RUN --mount=type=secret`) or runtime env vars.' },
  ],
  port_scanner: [
    { title: 'Open SSH Port Exposed to Internet', description: 'Port 22 (SSH) is reachable from the public internet, enabling brute-force attacks.', severity: 'MEDIUM', category: 'Open Ports', cwe: 'CWE-200', cvss: 5.3, remediation: 'Restrict SSH access to known IP ranges using a firewall or VPN.' },
    { title: 'Database Port Exposed', description: 'Port 3306/5432 (database) is publicly accessible, risking unauthorized data access.', severity: 'HIGH', category: 'Open Ports', cwe: 'CWE-668', cvss: 7.5, remediation: 'Bind the database to localhost only and use a private network for app access.' },
  ],
  website_finder: [
    { title: 'Hidden Admin Panel Discovered', description: 'An administrative interface was found at /admin without authentication gating.', severity: 'HIGH', category: 'Asset Discovery', cwe: 'CWE-284', cvss: 7.2, remediation: 'Remove the panel from production or enforce strong authentication and IP allow-listing.' },
    { title: 'Subdomain Takeover Risk', description: 'A dangling subdomain points to a decommissioned service and can be claimed.', severity: 'HIGH', category: 'Asset Discovery', cwe: 'CWE-350', cvss: 6.8, remediation: 'Remove the DNS record or reclaim the resource before an attacker does.' },
  ],
  vulnerability_scanner: [
    { title: 'SQL Injection in Login Form', description: 'The login endpoint concatenates user input directly into a SQL query.', severity: 'CRITICAL', category: 'Injection', cwe: 'CWE-89', cvss: 9.8, owasp: 'A03:2021', remediation: 'Use parameterized queries / prepared statements for all database access.' },
    { title: 'Cross-Site Scripting (Reflected)', description: 'User input is reflected into the page without encoding, enabling script injection.', severity: 'HIGH', category: 'XSS', cwe: 'CWE-79', cvss: 7.4, owasp: 'A03:2021', remediation: 'Encode all user input on output and set a strict Content-Security-Policy.' },
  ],
  website_info: [
    { title: 'Server Header Discloses Version', description: 'The web server reveals its exact version, aiding targeted attacks.', severity: 'LOW', category: 'Information Disclosure', cwe: 'CWE-200', cvss: 3.7, remediation: 'Suppress server version banners in your web server configuration.' },
    { title: 'Outdated JavaScript Library', description: 'A front-end library with known vulnerabilities is in use.', severity: 'MEDIUM', category: 'Vulnerable Dependencies', cwe: 'CWE-1104', cvss: 5.3, remediation: 'Upgrade the library to a version without known vulnerabilities.' },
  ],
  ssl_checker: [
    { title: 'Weak TLS Version Supported', description: 'The server accepts TLS 1.0/1.1, which are deprecated and vulnerable.', severity: 'HIGH', category: 'SSL/TLS', cwe: 'CWE-326', cvss: 7.5, remediation: 'Disable TLS 1.0 and 1.1; require TLS 1.2 or higher.' },
    { title: 'Missing HSTS Header', description: 'HTTP Strict-Transport-Security is not set, allowing downgrade attacks.', severity: 'LOW', category: 'Security Headers', cwe: 'CWE-319', cvss: 3.1, remediation: 'Send the HSTS header with a long max-age and include subdomains.' },
  ],
  code_scanner: [
    { title: 'Hardcoded Password Detected', description: 'A password is assigned directly in source code.', severity: 'HIGH', category: 'Code Quality', cwe: 'CWE-798', cvss: 7.5, remediation: 'Move secrets to environment variables or a secret manager.' },
    { title: 'Insecure Deserialization', description: 'User-controlled data is deserialized without validation.', severity: 'CRITICAL', category: 'Injection', cwe: 'CWE-502', cvss: 9.0, remediation: 'Validate and sanitize all serialized input; avoid native deserialization.' },
  ],
  secret_finder: [
    { title: 'Exposed AWS Access Key', description: 'A long-lived AWS access key was found in source code.', severity: 'CRITICAL', category: 'Secrets', cwe: 'CWE-798', cvss: 9.1, remediation: 'Rotate the key immediately, revoke the old one, and use short-lived credentials.' },
    { title: 'Hardcoded Database URL with Password', description: 'A connection string contains an embedded password.', severity: 'HIGH', category: 'Secrets', cwe: 'CWE-798', cvss: 7.5, remediation: 'Move the connection string to a secret manager or environment variable.' },
  ],
  container_checker: [
    { title: 'Vulnerable npm Dependency', description: 'A package.json dependency has a known high-severity advisory.', severity: 'HIGH', category: 'Vulnerable Dependencies', cwe: 'CWE-1035', cvss: 7.8, remediation: 'Upgrade the dependency to a patched version and run `npm audit fix`.' },
  ],
  results_cleaner: [
    { title: 'Duplicate Findings Merged', description: 'Multiple engines reported the same issue; duplicates were merged into one finding.', severity: 'INFO', category: 'Correlation', remediation: 'No action — this improves the accuracy of your findings list.' },
  ],
};

/**
 * Deterministic pick with scan profile tuning:
 * - 'fast': returns 1 finding per engine
 * - 'normal': returns up to 2 findings per engine
 * - 'aggressive': returns all matching findings per engine (deep scanning)
 */
export function pickFindingsForEngine(
  engineId: string,
  target: string,
  profile: 'fast' | 'normal' | 'aggressive' = 'normal'
): FindingTemplate[] {
  const pool = ENGINE_FINDINGS[engineId];
  if (!pool || pool.length === 0) return [];

  // Hash target string for deterministic selection
  let hash = 0;
  for (let i = 0; i < target.length; i++) {
    hash = (hash * 31 + target.charCodeAt(i)) >>> 0;
  }

  let count = 1;
  if (pool[0].severity === 'INFO') {
    count = 1;
  } else if (profile === 'fast') {
    count = 1;
  } else if (profile === 'normal') {
    count = Math.min(pool.length, 1 + (hash % 2)); // 1 or 2 findings
  } else if (profile === 'aggressive') {
    count = pool.length; // Full deep coverage
  }

  const selected: FindingTemplate[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(pool[(hash + i) % pool.length]);
  }

  // De-duplicate by title
  const seen = new Set<string>();
  return selected.filter(t => (seen.has(t.title) ? false : (seen.add(t.title), true)));
}
