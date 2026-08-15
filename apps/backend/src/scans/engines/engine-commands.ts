// import { EngineDef } from '@/lib/engines';

/**
 * Mapping of engine IDs to shell command templates.
 * Use <TARGET> placeholder which will be replaced with the actual target URL or IP.
 * Commands are expected to output plain text; we will perform simple pattern matching
 * to generate findings. This is intentionally lightweight for a demo deployment on
 * Kali Linux where the tools are pre‑installed.
 */
export const ENGINE_COMMANDS: Record<string, { cmd: string; parser: (output: string) => FindingTemplate[] }> = {
  // Network exposure – Nmap open ports scan
  network_exposure: {
    cmd: 'nmap -p- -Pn <TARGET>',
    parser: (out) => {
      const findings: FindingTemplate[] = [];
      const lines = out.split('\n');
      // Simple regex to capture open ports (e.g., "22/tcp open  ssh")
      const portRegex = /(\d+)\/tcp\s+open\s+(\S+)/i;
      for (const line of lines) {
        const m = portRegex.exec(line);
        if (m) {
          const port = m[1];
          const service = m[2];
          findings.push({
            title: `Open ${service.toUpperCase()} Port ${port}`,
            description: `Port ${port}/${service} is reachable from the public internet.`,
            severity: port === '22' || port === '3389' ? 'HIGH' : 'MEDIUM',
            category: 'Open Ports',
            cwe: 'CWE-200',
            cvss: port === '22' ? 5.3 : 4.0,
            remediation: `Restrict ${service} access to trusted IPs using a firewall or VPN.`,
          });
        }
      }
      return findings;
    },
  },
  // Vulnerability detection – Nuclei templates scan (fast mode)
  vulnerability_detection: {
    cmd: 'nuclei -u <TARGET> -silent',
    parser: (out) => {
      const findings: FindingTemplate[] = [];
      const lines = out.split('\n').filter(Boolean);
      for (const line of lines) {
        // Expected format: <url> [<template-id>] <severity> <info>
        const parts = line.split(' ');
        const severity = parts[2]?.toUpperCase() ?? 'INFO';
        const title = parts.slice(3).join(' ');
        findings.push({
          title: title || 'Potential vulnerability detected',
          description: `Nuclei reported a ${severity} issue at ${parts[0]}.`,
          severity: severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
          category: 'Vulnerability',
          remediation: 'Review the finding and apply the recommended fix.',
        });
      }
      return findings;
    },
  },
  // SSL/TLS analysis – testssl.sh
  ssl_tls_analysis: {
    cmd: 'testssl.sh <TARGET>',
    parser: (out) => {
      const findings: FindingTemplate[] = [];
      if (/TLS 1\.0|TLS 1\.1/.test(out)) {
        findings.push({
          title: 'Weak TLS Version Supported',
          description: 'The server accepts TLS 1.0/1.1, which are deprecated and vulnerable.',
          severity: 'HIGH',
          category: 'SSL/TLS',
          remediation: 'Disable TLS 1.0/1.1; require TLS 1.2 or higher.',
        });
      }
      if (/Certificate will expire soon/.test(out)) {
        findings.push({
          title: 'Certificate Expiring Soon',
          description: 'TLS certificate expires within the next 30 days.',
          severity: 'MEDIUM',
          category: 'SSL/TLS',
          remediation: 'Renew the certificate before expiration.',
        });
      }
      return findings;
    },
  },
  // Port Scanner – alias for network_exposure
  port_scanner: {
    cmd: 'nmap -p- -Pn <TARGET>',
    parser: (out) => {
      const findings = [];
      const lines = out.split('\n');
      const portRegex = /(\d+)\/tcp\s+open\s+(\S+)/i;
      for (const line of lines) {
        const m = portRegex.exec(line);
        if (m) {
          const port = m[1];
          const service = m[2];
          findings.push({
            title: `Open ${service.toUpperCase()} Port ${port}`,
            description: `Port ${port}/${service} is reachable from the public internet.`,
            severity: port === '22' || port === '3389' ? 'HIGH' : 'MEDIUM',
            category: 'Open Ports',
            cwe: 'CWE-200',
            cvss: port === '22' ? 5.3 : 4.0,
            remediation: `Restrict ${service} access to trusted IPs using a firewall or VPN.`,
          });
        }
      }
      return findings;
    },
  },

  // Vulnerability Scanner – alias for vulnerability_detection
  vulnerability_scanner: {
    cmd: 'nuclei -u <TARGET> -silent',
    parser: (out) => {
      const findings = [];
      const lines = out.split('\n').filter(Boolean);
      for (const line of lines) {
        const parts = line.split(' ');
        const severity = parts[2]?.toUpperCase() ?? 'INFO';
        const title = parts.slice(3).join(' ');
        findings.push({
          title: title || 'Potential vulnerability detected',
          description: `Nuclei reported a ${severity} issue at ${parts[0]}.`,
          severity: severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
          category: 'Vulnerability',
          remediation: 'Review the finding and apply the recommended fix.',
        });
      }
      return findings;
    },
  },

  // SSL Checker – alias for ssl_tls_analysis
  ssl_checker: {
    cmd: 'testssl.sh <TARGET>',
    parser: (out) => {
      const findings = [];
      if (/TLS 1\.0|TLS 1\.1/.test(out)) {
        findings.push({
          title: 'Weak TLS Version Supported',
          description: 'The server accepts TLS 1.0/1.1, which are deprecated and vulnerable.',
          severity: 'HIGH',
          category: 'SSL/TLS',
          remediation: 'Disable TLS 1.0/1.1; require TLS 1.2 or higher.',
        });
      }
      if (/Certificate will expire soon/.test(out)) {
        findings.push({
          title: 'Certificate Expiring Soon',
          description: 'TLS certificate expires within the next 30 days.',
          severity: 'MEDIUM',
          category: 'SSL/TLS',
          remediation: 'Renew the certificate before expiration.',
        });
      }
      return findings;
    },
  },


  // Website Finder – subfinder + httpx
  website_finder: {
    cmd: 'subfinder -d <TARGET> -silent && httpx -silent -title -tech-detect',
    parser: (out) => {
      const findings: FindingTemplate[] = [];
      const lines = out.split('\n').filter(Boolean);
      lines.forEach(line => {
        findings.push({
          title: `Discovered asset: ${line}`,
          description: `Subdomain or endpoint discovered during asset discovery.`,
          severity: 'INFO',
          category: 'Asset Discovery',
          remediation: 'Validate and secure the discovered asset.',
        });
      });
      return findings;
    },
  },

  // Website Info – technology detection via WhatWeb
  website_info: {
    cmd: 'whatweb <TARGET> --no-color',
    parser: (out) => {
      const findings: FindingTemplate[] = [];
      const lines = out.split('\n').filter(Boolean);
      lines.forEach(line => {
        findings.push({
          title: `Technology detected: ${line}`,
          description: `WhatWeb identified technology signatures.`,
          severity: 'INFO',
          category: 'Technology Detection',
          remediation: 'Review technologies for known vulnerabilities.',
        });
      });
      return findings;
    },
  },

  // Code Scanner – semgrep
  code_scanner: {
    cmd: 'semgrep --json --config=auto <TARGET>',
    parser: (out) => {
      const findings: FindingTemplate[] = [];
      try {
        const json = JSON.parse(out);
        json.results?.forEach((r: any) => {
          findings.push({
            title: r.check_name || 'Potential insecure code pattern',
            description: r.extra?.message || 'Semgrep detected an issue.',
            severity: (r.extra?.severity?.toUpperCase() as any) || 'MEDIUM',
            category: 'Static Analysis',
            remediation: 'Review and fix the reported code issue.',
          });
        });
      } catch {}
      return findings;
    },
  },

  // Container Checker – Trivy image scanning
  container_checker: {
    cmd: 'trivy image <TARGET>',
    parser: (out) => {
      const findings: FindingTemplate[] = [];
      const lines = out.split('\n');
      lines.forEach(line => {
        if (line.includes('CVE-')) {
          findings.push({
            title: `Container vulnerability: ${line}`,
            description: 'Trivy reported a vulnerability in the container image.',
            severity: 'HIGH',
            category: 'Supply Chain',
            remediation: 'Update the vulnerable component in the image.',
          });
        }
      });
      return findings;
    },
  },

  // Secret Finder – Gitleaks
  secret_finder: {
    cmd: 'gitleaks detect -s <TARGET> --no-git -r json',
    parser: (out) => {
      const findings: FindingTemplate[] = [];
      try {
        const json = JSON.parse(out);
        json.forEach((item: any) => {
          findings.push({
            title: `Secret exposed: ${item.Description || 'Potential secret'}`,
            description: `Gitleaks found a possible secret: ${item.Secret}`,
            severity: 'CRITICAL',
            category: 'Secrets',
            remediation: 'Rotate the secret and remove it from source.',
          });
        });
      } catch {}
      return findings;
    },
  },

  // Results Cleaner – no external command
  results_cleaner: {
    cmd: '',
    parser: () => [],
  },
};

/** Simple finding template interface used by parsers */
export interface FindingTemplate {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  cwe?: string;
  cvss?: number;
  owasp?: string;
  remediation: string;}
