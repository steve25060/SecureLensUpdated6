import { execSync } from 'child_process';

/**
 * Advanced Engine Commands for SecureLens Security Pipeline
 * Integrates: dnsx, subfinder, httpx, WhatWeb, testssl.sh, Katana, Nmap, Nuclei
 * 
 * Each engine executes in sequence following the security pipeline:
 * Website → Asset Discovery → Technology Detection → SSL/TLS → Endpoint Discovery → Vulnerability Detection
 */

export interface FindingTemplate {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  cwe?: string;
  cvss?: number;
  owasp?: string;
  remediation: string;
  metadata?: Record<string, any>;
}

export interface EngineCommandConfig {
  cmd: string;
  description: string;
  timeout?: number;
  requiresRootOrSudo?: boolean;
  parser: (output: string, target: string) => FindingTemplate[];
}

// ============================================================================
// STAGE 1: DNS & SUBDOMAIN DISCOVERY (dnsx, subfinder)
// ============================================================================

const dnsx_command: EngineCommandConfig = {
  description: 'DNS resolution and validation using dnsx',
  cmd: 'echo "<TARGET>" | dnsx -json 2>/dev/null || echo ""',
  timeout: 30,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const lines = output.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        try {
          const json = JSON.parse(line);
          if (json.a && json.a.length > 0) {
            findings.push({
              title: `DNS Resolution: ${json.host || target}`,
              description: `Resolved to IPs: ${json.a.join(', ')}`,
              severity: 'INFO',
              category: 'DNS Resolution',
              remediation: 'Validate DNS records are intentional and secure.',
              metadata: { ips: json.a, ttl: json.ttl },
            });
          }
        } catch {}
      });
    } catch {}
    return findings;
  },
};

const subfinder_command: EngineCommandConfig = {
  description: 'Subdomain enumeration using subfinder',
  cmd: 'subfinder -d <TARGET> -silent 2>/dev/null || echo ""',
  timeout: 60,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const lines = output.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const subdomain = line.trim();
        if (subdomain && !subdomain.startsWith('{')) {
          findings.push({
            title: `Subdomain Discovered: ${subdomain}`,
            description: `Enumerated subdomain: ${subdomain}`,
            severity: 'INFO',
            category: 'Asset Discovery',
            remediation: 'Inventory and audit all discovered subdomains for security.',
            metadata: { subdomain, parent: target },
          });
        }
      });
    } catch {}
    return findings;
  },
};

// ============================================================================
// STAGE 2: LIVE ASSET DETECTION (httpx)
// ============================================================================

const httpx_command: EngineCommandConfig = {
  description: 'Detect live HTTP/HTTPS services with httpx',
  cmd: 'echo "<TARGET>" | httpx -json -title -status-code 2>/dev/null || echo ""',
  timeout: 120,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const lines = output.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        try {
          const json = JSON.parse(line);
          if (json.url) {
            const status = json['status-code'];
            if (status >= 500) {
              findings.push({
                title: `Server Error on ${json.url}`,
                description: `HTTP ${status} Server Error detected`,
                severity: 'MEDIUM',
                category: 'HTTP Issues',
                remediation: 'Investigate server errors and fix root cause.',
              });
            } else {
              findings.push({
                title: `Live HTTP Service: ${json.url}`,
                description: `HTTP ${status || 200} service running (${json.title || 'No Title'})`,
                severity: 'INFO',
                category: 'Asset Discovery',
                remediation: 'Ensure HTTP headers and TLS are properly hardened.',
                metadata: { url: json.url, status },
              });
            }
          }
        } catch {}
      });
    } catch {}
    return findings;
  },
};

// ============================================================================
// STAGE 3: TECHNOLOGY & WEB FRAMEWORK DETECTION (WhatWeb)
// ============================================================================

const whatweb_command: EngineCommandConfig = {
  description: 'Web technology fingerprinting using WhatWeb',
  cmd: 'whatweb <TARGET> --log-json=- 2>/dev/null || echo ""',
  timeout: 60,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const json = JSON.parse(output);
      const results = Array.isArray(json) ? json : [json];

      results.forEach((result: any) => {
        if (result.plugins) {
          const plugins = Object.keys(result.plugins);
          plugins.forEach(plugin => {
            const details = result.plugins[plugin];
            findings.push({
              title: `Technology Detected: ${plugin}`,
              description: `Detected ${plugin}${details.version ? ` v${details.version}` : ''}`,
              severity: 'INFO',
              category: 'Technology Detection',
              remediation: 'Monitor for vulnerabilities related to this technology.',
              metadata: { plugin, version: details.version },
            });
          });
        }
      });
    } catch {}
    return findings;
  },
};

// ============================================================================
// STAGE 4: SSL/TLS SECURITY ANALYSIS (testssl)
// ============================================================================

const testssl_command: EngineCommandConfig = {
  description: 'SSL/TLS configuration analysis using testssl',
  cmd: 'timeout 60 testssl --quiet --fast <TARGET> 2>/dev/null || echo ""',
  timeout: 75,
  requiresRootOrSudo: false,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    if (output.includes('TLS 1.0') || output.includes('TLS 1.1')) {
      findings.push({
        title: `Legacy TLS Version Enabled on ${target}`,
        description: `Server supports deprecated TLS 1.0 or 1.1 protocols.`,
        severity: 'HIGH',
        category: 'SSL/TLS',
        cwe: 'CWE-326',
        cvss: 7.5,
        remediation: 'Disable TLS 1.0/1.1 and enforce TLS 1.2 and TLS 1.3.',
      });
    }
    return findings;
  },
};

// ============================================================================
// STAGE 5: ENDPOINT DISCOVERY & WEB CRAWLING (Katana)
// ============================================================================

const katana_command: EngineCommandConfig = {
  description: 'Web endpoint discovery using Katana',
  cmd: 'katana -u <TARGET> -jsonl -silent 2>/dev/null | head -50 || echo ""',
  timeout: 90,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const lines = output.split('\n').filter(l => l.trim());
      const endpoints = new Set<string>();

      lines.forEach(line => {
        try {
          const json = JSON.parse(line);
          const endpointUrl = json.endpoint || json.request?.url || json.url;
          if (endpointUrl) {
            endpoints.add(endpointUrl);
          }
        } catch {}
      });

      if (endpoints.size > 0) {
        findings.push({
          title: `Endpoints Discovered: ${endpoints.size} URLs`,
          description: `Katana crawled ${endpoints.size} active endpoint paths on ${target}`,
          severity: 'INFO',
          category: 'Endpoint Discovery',
          remediation: 'Audit discovered endpoints for authorization checks.',
          metadata: { count: endpoints.size },
        });
      }
    } catch {}
    return findings;
  },
};

// ============================================================================
// STAGE 6: NETWORK EXPOSURE & PORT SCANNING (Nmap)
// ============================================================================

const nmap_command: EngineCommandConfig = {
  description: 'Network port and service scanning using Nmap',
  cmd: 'nmap -F --open -sV <TARGET> 2>/dev/null || echo ""',
  timeout: 120,
  requiresRootOrSudo: false,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const lines = output.split('\n');
      lines.forEach(line => {
        const match = line.match(/^(\d+\/(?:tcp|udp))\s+(\w+)\s+(\S+)\s*(.*)$/);
        if (match) {
          const [, portProto, state, service, version] = match;
          const isCriticalPort = ['22/tcp', '3389/tcp', '5432/tcp', '6379/tcp', '27017/tcp'].includes(portProto);
          findings.push({
            title: `Open Network Port: ${portProto} (${service})`,
            description: `Port ${portProto} is ${state} running ${service} ${version}`.trim(),
            severity: isCriticalPort ? 'HIGH' : 'MEDIUM',
            category: 'Network Exposure',
            cwe: 'CWE-200',
            cvss: isCriticalPort ? 7.5 : 5.3,
            remediation: `Ensure port ${portProto} is protected by a firewall or VPN.`,
            metadata: { port: portProto, service, version },
          });
        }
      });
    } catch {}
    return findings;
  },
};

// ============================================================================
// STAGE 7: VULNERABILITY SCANNING (Nuclei)
// ============================================================================

const nuclei_command: EngineCommandConfig = {
  description: 'Vulnerability detection using Nuclei templates',
  cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 5 2>/dev/null || echo ""',
  timeout: 45,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const lines = output.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        try {
          const json = JSON.parse(line);
          if (json.info) {
            const sev = (json.info.severity || 'INFO').toUpperCase();
            const validSev = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(sev) ? sev : 'INFO';
            findings.push({
              title: json.info.name || 'Nuclei Finding',
              description: json.info.description || `Nuclei template match on ${json['matched-at'] || target}`,
              severity: validSev as any,
              category: 'Vulnerability',
              cwe: json.info.classification?.['cwe-id']?.[0],
              cvss: json.info.classification?.['cvss-score'],
              remediation: json.info.remediation || 'Apply patch or review security configuration.',
              metadata: {
                templateId: json['template-id'],
                matchedAt: json['matched-at'],
              },
            });
          }
        } catch {}
      });
    } catch {}
    return findings;
  },
};

// ============================================================================
// STAGE 8: GITHUB & REPOSITORY SECURITY SCANS (Semgrep, Gitleaks, Trivy, Checkov)
// ============================================================================

const parseGitHubScannerOutput = (output: string): FindingTemplate[] => {
  const findings: FindingTemplate[] = [];
  if (!output.trim()) return findings;
  try {
    const json = JSON.parse(output.trim());
    const items = json.findings || (Array.isArray(json) ? json : []);
    items.forEach((item: any) => {
      findings.push({
        title: item.title,
        description: item.description || item.title,
        severity: item.severity || 'MEDIUM',
        category: item.category || 'Repository Security',
        cwe: item.cwe,
        cvss: item.cvss,
        owasp: item.owasp,
        remediation: item.remediation || 'Remediate identified security issue.',
      });
    });
  } catch {}
  return findings;
};

const repository_overview_command: EngineCommandConfig = {
  description: 'Detect languages, frameworks, package managers, and structure',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "repository_overview" 2>/dev/null || echo "{\\"findings\\":[]}"',
  timeout: 45,
  parser: parseGitHubScannerOutput,
};

const code_security_command: EngineCommandConfig = {
  description: 'Code Security Check (Semgrep OSS - Static Application Security Testing)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "code_security" 2>/dev/null || echo "{\\"findings\\":[]}"',
  timeout: 60,
  parser: parseGitHubScannerOutput,
};

const secret_detection_command: EngineCommandConfig = {
  description: 'Secret Detection (Gitleaks - Exposed API Keys, Tokens & Passwords)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "secret_detection" 2>/dev/null || echo "{\\"findings\\":[]}"',
  timeout: 45,
  parser: parseGitHubScannerOutput,
};

const dependency_analysis_command: EngineCommandConfig = {
  description: 'Dependency Security Check (Trivy - Vulnerable Package & Supply Chain Flaws)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "dependency_analysis" 2>/dev/null || echo "{\\"findings\\":[]}"',
  timeout: 60,
  parser: parseGitHubScannerOutput,
};

const infrastructure_security_command: EngineCommandConfig = {
  description: 'Infrastructure Security Check (Checkov - Terraform, Kubernetes & IaC Misconfigurations)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "infrastructure_security" 2>/dev/null || echo "{\\"findings\\":[]}"',
  timeout: 60,
  parser: parseGitHubScannerOutput,
};

const cicd_security_command: EngineCommandConfig = {
  description: 'CI/CD & Pipeline Security Check (GitHub Actions Workflow Auditor)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "cicd_security" 2>/dev/null || echo "{\\"findings\\":[]}"',
  timeout: 45,
  parser: parseGitHubScannerOutput,
};

const license_compliance_command: EngineCommandConfig = {
  description: 'License Compliance & Legal Risk Check (Open-Source License & Legal Compliance)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "license_compliance" 2>/dev/null || echo "{\\"findings\\":[]}"',
  timeout: 30,
  parser: parseGitHubScannerOutput,
};

const container_security_command: EngineCommandConfig = {
  description: 'Container & Dockerfile Security Check (Base Images, Root Execution & Container Hardening)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "container_security" 2>/dev/null || echo "{\\"findings\\":[]}"',
  timeout: 45,
  parser: parseGitHubScannerOutput,
};

const http_security_command: EngineCommandConfig = {
  description: 'Deep HTTP security headers, cookies, and CORS audit',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/http-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"',
  timeout: 30,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;
    try {
      const parsed = JSON.parse(output.trim());
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          findings.push({
            title: p.title,
            description: p.description || p.title,
            severity: p.severity || 'MEDIUM',
            category: p.category || 'Security Headers',
            cwe: p.cwe || 'CWE-1021',
            cvss: p.cvss || 6.5,
            owasp: p.owasp || 'A05:2021-Security Misconfiguration',
            remediation: p.remediation || 'Configure secure HTTP response headers.',
          });
        });
      }
    } catch {}
    return findings;
  },
};

const api_security_command: EngineCommandConfig = {
  description: 'API Security & GraphQL Auditor (OpenAPI/Swagger docs & GraphQL introspection)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/api-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"',
  timeout: 30,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;
    try {
      const parsed = JSON.parse(output.trim());
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          findings.push({
            title: p.title,
            description: p.description || p.title,
            severity: p.severity || 'MEDIUM',
            category: p.category || 'API Security',
            cwe: p.cwe || 'CWE-200',
            cvss: p.cvss || 5.3,
            owasp: p.owasp || 'API9:2023-Improper Inventory Management',
            remediation: p.remediation || 'Harden public API endpoints and disable GraphQL introspection.',
            metadata: p.metadata,
          });
        });
      }
    } catch {}
    return findings;
  },
};

const waf_detection_command: EngineCommandConfig = {
  description: 'WAF & Perimeter Defense (Cloudflare, AWS WAF, Akamai & Origin Protection)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/waf-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"',
  timeout: 20,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;
    try {
      const parsed = JSON.parse(output.trim());
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          findings.push({
            title: p.title,
            description: p.description || p.title,
            severity: p.severity || 'INFO',
            category: p.category || 'Perimeter Defense',
            cwe: p.cwe || 'CWE-1008',
            cvss: p.cvss || 0.0,
            owasp: p.owasp || 'A05:2021-Security Misconfiguration',
            remediation: p.remediation || 'Deploy and maintain an active Web Application Firewall.',
            metadata: p.metadata,
          });
        });
      }
    } catch {}
    return findings;
  },
};

const email_security_command: EngineCommandConfig = {
  description: 'Email Security & Anti-Spoofing Check (DMARC, SPF, and MX Validation)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/email-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"',
  timeout: 25,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;
    try {
      const parsed = JSON.parse(output.trim());
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          findings.push({
            title: p.title,
            description: p.description || p.title,
            severity: p.severity || 'HIGH',
            category: p.category || 'Email Security',
            cwe: p.cwe || 'CWE-290',
            cvss: p.cvss || 7.5,
            owasp: p.owasp || 'A05:2021-Security Misconfiguration',
            remediation: p.remediation || 'Publish strict DMARC and SPF DNS records.',
            metadata: p.metadata,
          });
        });
      }
    } catch {}
    return findings;
  },
};

const privacy_compliance_command: EngineCommandConfig = {
  description: 'Privacy & Cookie Compliance Check (Trackers, PII, and Mixed Content)',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/privacy-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"',
  timeout: 25,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;
    try {
      const parsed = JSON.parse(output.trim());
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          findings.push({
            title: p.title,
            description: p.description || p.title,
            severity: p.severity || 'LOW',
            category: p.category || 'Privacy & Compliance',
            cwe: p.cwe || 'CWE-359',
            cvss: p.cvss || 3.5,
            owasp: p.owasp || 'A05:2021-Security Misconfiguration',
            remediation: p.remediation || 'Implement a Consent Management Platform and eliminate insecure mixed content.',
            metadata: p.metadata,
          });
        });
      }
    } catch {}
    return findings;
  },
};

const security_intelligence_command: EngineCommandConfig = {
  description: 'Correlate attack surface data, CVSS prioritization & threat intelligence',
  cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/security-intelligence.js "<TARGET>" 2>/dev/null || echo "[]"',
  timeout: 20,
  parser: (output: string, target: string): FindingTemplate[] => {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;
    try {
      const parsed = JSON.parse(output.trim());
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          findings.push({
            title: p.title,
            description: p.description || p.title,
            severity: p.severity || 'INFO',
            category: p.category || 'Security Intelligence',
            cwe: p.cwe || 'CWE-1008',
            cvss: p.cvss || 3.0,
            owasp: p.owasp || 'A00:2021-Threat Modeling',
            remediation: p.remediation || 'Implement continuous attack surface monitoring.',
            metadata: p.metadata,
          });
        });
      }
    } catch {}
    return findings;
  },
};

// ============================================================================
// UNIFIED ENGINE COMMANDS REGISTRY
// ============================================================================

export const ADVANCED_ENGINE_COMMANDS: Record<string, EngineCommandConfig> = {
  dnsx: dnsx_command,
  dns_check: dnsx_command,
  subfinder: subfinder_command,
  subdomain_discovery: subfinder_command,
  httpx: httpx_command,
  asset_discovery: httpx_command,
  whatweb: whatweb_command,
  tech_detection: whatweb_command,
  http_security: http_security_command,
  api_security: api_security_command,
  waf_detection: waf_detection_command,
  email_security: email_security_command,
  privacy_compliance: privacy_compliance_command,
  testssl: testssl_command,
  ssl_tls_analysis: testssl_command,
  katana: katana_command,
  endpoint_discovery: katana_command,
  nmap: nmap_command,
  network_exposure: nmap_command,
  nuclei: nuclei_command,
  vulnerability_detection: nuclei_command,
  security_intelligence: security_intelligence_command,
  results_cleaner: security_intelligence_command,
  repository_overview: repository_overview_command,
  code_security: code_security_command,
  code_scanner: code_security_command,
  secret_detection: secret_detection_command,
  secret_finder: secret_detection_command,
  dependency_analysis: dependency_analysis_command,
  container_checker: dependency_analysis_command,
  infrastructure_security: infrastructure_security_command,
  cicd_security: cicd_security_command,
  license_compliance: license_compliance_command,
  container_security: container_security_command,
  vulnerability_scanner: nuclei_command,
  port_scanner: nmap_command,
  website_finder: subfinder_command,
  website_info: whatweb_command,
  ssl_checker: testssl_command,
};

// ============================================================================
// HELPER FUNCTIONS & PROFILE COMMAND LOOKUP
// ============================================================================

export type ScanProfile = 'fast' | 'normal' | 'aggressive';

export interface ProfileCommandConfig {
  fast: { cmd: string; timeout: number };
  normal: { cmd: string; timeout: number };
  aggressive: { cmd: string; timeout: number };
}

const ENGINE_PROFILE_COMMANDS: Record<string, ProfileCommandConfig> = {
  dnsx: {
    fast: { cmd: 'echo "<TARGET>" | dnsx -json -t 50 2>/dev/null || echo ""', timeout: 15 },
    normal: { cmd: 'echo "<TARGET>" | dnsx -json -a -aaaa -cname 2>/dev/null || echo ""', timeout: 30 },
    aggressive: { cmd: 'echo "<TARGET>" | dnsx -json -a -aaaa -cname -mx -txt -ns -soa -ptr -resp -recon -retry 3 -timeout 15 2>/dev/null || echo ""', timeout: 90 },
  },
  dns_check: {
    fast: { cmd: 'echo "<TARGET>" | dnsx -json -t 50 2>/dev/null || echo ""', timeout: 15 },
    normal: { cmd: 'echo "<TARGET>" | dnsx -json -a -aaaa -cname 2>/dev/null || echo ""', timeout: 30 },
    aggressive: { cmd: 'echo "<TARGET>" | dnsx -json -a -aaaa -cname -mx -txt -ns -soa -ptr -resp -recon -retry 3 -timeout 15 2>/dev/null || echo ""', timeout: 90 },
  },
  subfinder: {
    fast: { cmd: 'subfinder -d <TARGET> -silent -max-time 15 2>/dev/null || echo ""', timeout: 20 },
    normal: { cmd: 'subfinder -d <TARGET> -silent -max-time 45 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'subfinder -d <TARGET> -silent -all -recursive -t 50 -max-time 180 2>/dev/null || echo ""', timeout: 190 },
  },
  subdomain_discovery: {
    fast: { cmd: 'subfinder -d <TARGET> -silent -max-time 15 2>/dev/null || echo ""', timeout: 20 },
    normal: { cmd: 'subfinder -d <TARGET> -silent -max-time 45 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'subfinder -d <TARGET> -silent -all -recursive -t 50 -max-time 180 2>/dev/null || echo ""', timeout: 190 },
  },
  httpx: {
    fast: { cmd: 'echo "<TARGET>" | httpx -json -title -status-code -timeout 5 2>/dev/null || echo ""', timeout: 30 },
    normal: { cmd: 'echo "<TARGET>" | httpx -json -title -tech-detect -status-code -content-type -timeout 10 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'echo "<TARGET>" | httpx -json -title -tech-detect -status-code -content-type -server -web-server -favicon -jarm -tls-grab -probe -asn -cdn -threads 50 -timeout 25 2>/dev/null || echo ""', timeout: 150 },
  },
  asset_discovery: {
    fast: { cmd: 'echo "<TARGET>" | httpx -json -title -status-code -timeout 5 2>/dev/null || echo ""', timeout: 30 },
    normal: { cmd: 'echo "<TARGET>" | httpx -json -title -tech-detect -status-code -content-type -timeout 10 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'echo "<TARGET>" | httpx -json -title -tech-detect -status-code -content-type -server -web-server -favicon -jarm -tls-grab -probe -asn -cdn -threads 50 -timeout 25 2>/dev/null || echo ""', timeout: 150 },
  },
  whatweb: {
    fast: { cmd: 'whatweb <TARGET> -a 1 --log-json=- 2>/dev/null || echo ""', timeout: 30 },
    normal: { cmd: 'whatweb <TARGET> -a 3 --log-json=- 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'whatweb <TARGET> -a 4 --user-agent "Mozilla/5.0 SecureLens-Security-Audit" --max-threads 30 --log-json=- 2>/dev/null || echo ""', timeout: 150 },
  },
  tech_detection: {
    fast: { cmd: 'whatweb <TARGET> -a 1 --log-json=- 2>/dev/null || echo ""', timeout: 30 },
    normal: { cmd: 'whatweb <TARGET> -a 3 --log-json=- 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'whatweb <TARGET> -a 4 --user-agent "Mozilla/5.0 SecureLens-Security-Audit" --max-threads 30 --log-json=- 2>/dev/null || echo ""', timeout: 150 },
  },
  testssl: {
    fast: { cmd: 'timeout 30 testssl --quiet --fast <TARGET> 2>/dev/null || echo ""', timeout: 35 },
    normal: { cmd: 'timeout 60 testssl --quiet --fast --poodle --freak <TARGET> 2>/dev/null || echo ""', timeout: 75 },
    aggressive: { cmd: 'timeout 180 testssl --quiet --full --vulnerable --sneaky --warnings batch <TARGET> 2>/dev/null || echo ""', timeout: 190 },
  },
  ssl_tls_analysis: {
    fast: { cmd: 'timeout 30 testssl --quiet --fast <TARGET> 2>/dev/null || echo ""', timeout: 35 },
    normal: { cmd: 'timeout 60 testssl --quiet --fast --poodle --freak <TARGET> 2>/dev/null || echo ""', timeout: 75 },
    aggressive: { cmd: 'timeout 180 testssl --quiet --full --vulnerable --sneaky --warnings batch <TARGET> 2>/dev/null || echo ""', timeout: 190 },
  },
  katana: {
    fast: { cmd: 'katana -u <TARGET> -jsonl -silent -d 1 -timeout 5 2>/dev/null | head -30 || echo ""', timeout: 20 },
    normal: { cmd: 'katana -u <TARGET> -jsonl -silent -d 3 -timeout 10 2>/dev/null | head -100 || echo ""', timeout: 60 },
    aggressive: { cmd: 'katana -u <TARGET> -jsonl -silent -d 6 -jc -ct 50 -f qurl -kf all -c 40 -timeout 30 2>/dev/null | head -500 || echo ""', timeout: 160 },
  },
  endpoint_discovery: {
    fast: { cmd: 'katana -u <TARGET> -jsonl -silent -d 1 -timeout 5 2>/dev/null | head -30 || echo ""', timeout: 20 },
    normal: { cmd: 'katana -u <TARGET> -jsonl -silent -d 3 -timeout 10 2>/dev/null | head -100 || echo ""', timeout: 60 },
    aggressive: { cmd: 'katana -u <TARGET> -jsonl -silent -d 6 -jc -ct 50 -f qurl -kf all -c 40 -timeout 30 2>/dev/null | head -500 || echo ""', timeout: 160 },
  },
  nmap: {
    fast: { cmd: 'nmap -F --open -sV <TARGET> 2>/dev/null || echo ""', timeout: 45 },
    normal: { cmd: 'nmap -p 21,22,23,25,53,80,110,143,443,465,587,993,995,1433,1521,3306,3389,5432,5900,6379,8000,8080,8443,8888,9200,27017 --open -sV <TARGET> 2>/dev/null || echo ""', timeout: 90 },
    aggressive: { cmd: 'nmap -p- --open -sV -sC --version-all --traceroute -T4 --script "banner,ssl-enum-ciphers,http-headers,http-title,vulners" <TARGET> 2>/dev/null || echo ""', timeout: 300 },
  },
  network_exposure: {
    fast: { cmd: 'nmap -F --open -sV <TARGET> 2>/dev/null || echo ""', timeout: 45 },
    normal: { cmd: 'nmap -p 21,22,23,25,53,80,110,143,443,465,587,993,995,1433,1521,3306,3389,5432,5900,6379,8000,8080,8443,8888,9200,27017 --open -sV <TARGET> 2>/dev/null || echo ""', timeout: 90 },
    aggressive: { cmd: 'nmap -p- --open -sV -sC --version-all --traceroute -T4 --script "banner,ssl-enum-ciphers,http-headers,http-title,vulners" <TARGET> 2>/dev/null || echo ""', timeout: 300 },
  },
  nuclei: {
    fast: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 5 -t http/technologies,http/exposures 2>/dev/null || echo ""', timeout: 30 },
    normal: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 8 -t http/exposures,http/vulnerabilities,http/misconfiguration 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 20 -dast -severity critical,high,medium,low -t cves,http/vulnerabilities,http/misconfiguration,http/exposures,http/cves,network,ssl 2>/dev/null || echo ""', timeout: 240 },
  },
  vulnerability_detection: {
    fast: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 5 -t http/technologies,http/exposures 2>/dev/null || echo ""', timeout: 30 },
    normal: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 8 -t http/exposures,http/vulnerabilities,http/misconfiguration 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 20 -dast -severity critical,high,medium,low -t cves,http/vulnerabilities,http/misconfiguration,http/exposures,http/cves,network,ssl 2>/dev/null || echo ""', timeout: 240 },
  },
  repository_overview: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "repository_overview" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 20 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "repository_overview" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 45 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "repository_overview" --deep --ast-full 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 90 },
  },
  code_security: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "code_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 30 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "code_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 60 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "code_security" --deep --ast-full --all-rules 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 150 },
  },
  secret_detection: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "secret_detection" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 25 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "secret_detection" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 45 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "secret_detection" --deep --all-commits --history 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 120 },
  },
  dependency_analysis: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "dependency_analysis" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 30 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "dependency_analysis" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 60 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "dependency_analysis" --deep --full-tree --transitive 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 150 },
  },
  infrastructure_security: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "infrastructure_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 30 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "infrastructure_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 60 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "infrastructure_security" --deep --checkov-full 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 150 },
  },
  cicd_security: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "cicd_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 25 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "cicd_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 45 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "cicd_security" --deep --actions-audit 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 120 },
  },
  license_compliance: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "license_compliance" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 20 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "license_compliance" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 30 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "license_compliance" --deep --gpl-audit 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 90 },
  },
  container_security: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "container_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 25 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "container_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 45 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "container_security" --deep --docker-cis 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 120 },
  },
  secret_finder: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "secret_detection" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 25 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "secret_detection" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 45 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "secret_detection" --deep --all-commits --history 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 120 },
  },
  code_scanner: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "code_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 30 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "code_security" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 60 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "code_security" --deep --ast-full --all-rules 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 150 },
  },
  container_checker: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "dependency_analysis" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 30 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "dependency_analysis" 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 60 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/github-security-scanner.js "<TARGET>" "dependency_analysis" --deep --full-tree --transitive 2>/dev/null || echo "{\\"findings\\":[]}"', timeout: 150 },
  },
  vulnerability_scanner: {
    fast: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 5 -t http/technologies,http/exposures 2>/dev/null || echo ""', timeout: 30 },
    normal: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 8 -t http/exposures,http/vulnerabilities,http/misconfiguration 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'nuclei -u <TARGET> -jsonl -silent -timeout 20 -dast -severity critical,high,medium,low -t cves,http/vulnerabilities,http/misconfiguration,http/exposures,http/cves,network,ssl 2>/dev/null || echo ""', timeout: 240 },
  },
  port_scanner: {
    fast: { cmd: 'nmap -F --open -sV <TARGET> 2>/dev/null || echo ""', timeout: 45 },
    normal: { cmd: 'nmap -p 21,22,23,25,53,80,110,143,443,465,587,993,995,1433,1521,3306,3389,5432,5900,6379,8000,8080,8443,8888,9200,27017 --open -sV <TARGET> 2>/dev/null || echo ""', timeout: 90 },
    aggressive: { cmd: 'nmap -p- --open -sV -sC --version-all --traceroute -T4 --script "banner,ssl-enum-ciphers,http-headers,http-title,vulners" <TARGET> 2>/dev/null || echo ""', timeout: 300 },
  },
  website_finder: {
    fast: { cmd: 'subfinder -d <TARGET> -silent -max-time 15 2>/dev/null || echo ""', timeout: 20 },
    normal: { cmd: 'subfinder -d <TARGET> -silent -max-time 45 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'subfinder -d <TARGET> -silent -all -recursive -t 50 -max-time 180 2>/dev/null || echo ""', timeout: 190 },
  },
  website_info: {
    fast: { cmd: 'whatweb <TARGET> -a 1 --log-json=- 2>/dev/null || echo ""', timeout: 30 },
    normal: { cmd: 'whatweb <TARGET> -a 3 --log-json=- 2>/dev/null || echo ""', timeout: 60 },
    aggressive: { cmd: 'whatweb <TARGET> -a 4 --user-agent "Mozilla/5.0 SecureLens-Security-Audit" --max-threads 30 --log-json=- 2>/dev/null || echo ""', timeout: 150 },
  },
  ssl_checker: {
    fast: { cmd: 'timeout 30 testssl --quiet --fast <TARGET> 2>/dev/null || echo ""', timeout: 35 },
    normal: { cmd: 'timeout 60 testssl --quiet --fast --poodle --freak <TARGET> 2>/dev/null || echo ""', timeout: 75 },
    aggressive: { cmd: 'timeout 180 testssl --quiet --full --vulnerable --sneaky --warnings batch <TARGET> 2>/dev/null || echo ""', timeout: 190 },
  },
  http_security: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/http-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 15 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/http-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 30 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/http-security-audit.js "<TARGET>" --deep --fuzz-cors --check-all-headers 2>/dev/null || echo "[]"', timeout: 60 },
  },
  api_security: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/api-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 15 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/api-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 30 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/api-security-audit.js "<TARGET>" --deep --swagger-discovery --graphql-probe --jwt-fuzz 2>/dev/null || echo "[]"', timeout: 60 },
  },
  waf_detection: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/waf-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 15 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/waf-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 20 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/waf-security-audit.js "<TARGET>" --deep --bypass-analysis --cloud-fingerprint 2>/dev/null || echo "[]"', timeout: 45 },
  },
  email_security: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/email-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 15 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/email-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 25 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/email-security-audit.js "<TARGET>" --deep --spf --dkim --dmarc --bimi --mta-sts 2>/dev/null || echo "[]"', timeout: 50 },
  },
  privacy_compliance: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/privacy-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 15 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/privacy-security-audit.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 25 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/privacy-security-audit.js "<TARGET>" --deep --gdpr --ccpa --cookie-inventory --third-party-trackers 2>/dev/null || echo "[]"', timeout: 50 },
  },
  security_intelligence: {
    fast: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/security-intelligence.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 15 },
    normal: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/security-intelligence.js "<TARGET>" 2>/dev/null || echo "[]"', timeout: 20 },
    aggressive: { cmd: 'node /home/stavan/SecureLensUpdated1/apps/backend/scripts/security-intelligence.js "<TARGET>" --deep --threat-correlation --cve-intel 2>/dev/null || echo "[]"', timeout: 45 },
  },
};

function isOutdatedVersion(plugin: string, version: string): boolean {
  const outdatedPatterns: Record<string, RegExp> = {
    'WordPress': /^[0-4]\./,
    'Drupal': /^[0-7]\./,
    'Joomla': /^[0-2]\./,
    'PHP': /^5\./,
    'Apache': /^2\.[0-2]\./,
    'Nginx': /^1\.[0-8]\./,
  };

  const pattern = outdatedPatterns[plugin];
  return pattern ? pattern.test(version) : false;
}

export function getEngineCommand(engineId: string): EngineCommandConfig | undefined {
  return ADVANCED_ENGINE_COMMANDS[engineId.toLowerCase()];
}

export function getEngineCommandForProfile(
  engineId: string,
  profile: ScanProfile = 'normal',
): EngineCommandConfig | undefined {
  const base = ADVANCED_ENGINE_COMMANDS[engineId.toLowerCase()];
  if (!base) return undefined;

  const profConfig = ENGINE_PROFILE_COMMANDS[engineId.toLowerCase()]?.[profile]
    || ENGINE_PROFILE_COMMANDS[engineId.toLowerCase()]?.normal;

  if (!profConfig) return base;

  return {
    ...base,
    cmd: profConfig.cmd,
    timeout: profConfig.timeout,
  };
}

export function getAllEngineIds(): string[] {
  return Object.keys(ADVANCED_ENGINE_COMMANDS);
}
