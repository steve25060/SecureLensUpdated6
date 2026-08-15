import { FindingTemplate } from './engine-commands-advanced';

/**
 * Advanced Result Parser for SecureLens
 * Handles complex JSON, XML, and text parsing from security tools
 * Normalizes disparate formats into unified FindingTemplate objects
 */

// ============================================================================
// SPECIALIZED PARSERS FOR COMPLEX TOOL OUTPUTS
// ============================================================================

export class AdvancedResultParser {
  /**
   * Parse Nuclei JSON output (line-delimited JSON)
   */
  static parseNucleiOutput(output: string): FindingTemplate[] {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    const lines = output.split('\n').filter(l => l.trim());
    const seen = new Set<string>();

    lines.forEach(line => {
      try {
        const json = JSON.parse(line);
        if (json.info && json.matched) {
          const key = `${json.template_id}-${json.matched}`;
          
          // Deduplicate
          if (seen.has(key)) return;
          seen.add(key);

          const severity = (json.info.severity || 'info').toUpperCase();
          const severityMap: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'> = {
            'CRITICAL': 'CRITICAL',
            'HIGH': 'HIGH',
            'MEDIUM': 'MEDIUM',
            'LOW': 'LOW',
            'INFO': 'INFO',
          };

          findings.push({
            title: json.info.name || 'Nuclei Finding',
            description: `${json.info.description || ''}\nMatched at: ${json.matched}`,
            severity: severityMap[severity] || 'MEDIUM',
            category: 'Vulnerability Detection',
            cwe: json.info.cwe?.[0],
            cvss: json.info.cvss_score,
            owasp: json.info.owasp_category?.[0],
            remediation: json.info.remediation || 'Review the vulnerability details and apply appropriate fix.',
            metadata: {
              templateId: json.template_id,
              reference: json.info.reference,
              cves: json.info.cves || [],
              tags: json.info.tags || [],
            },
          });
        }
      } catch (e) {
        // Skip malformed JSON lines
      }
    });

    return findings;
  }

  /**
   * Parse testssl.sh JSON output (comprehensive SSL/TLS analysis)
   */
  static parseTestsslOutput(output: string): FindingTemplate[] {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const json = JSON.parse(output);
      const results = Array.isArray(json) ? json : json.results || [];

      // Check critical findings
      results.forEach((result: any) => {
        if (!result.severity || result.severity === 'OK') return;

        const severityMap: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
          'CRITICAL': 'CRITICAL',
          'HIGH': 'HIGH',
          'MEDIUM': 'MEDIUM',
          'LOW': 'LOW',
          'WARN': 'HIGH',
        };

        findings.push({
          title: `TLS: ${result.title || result.id}`,
          description: result.finding || result.title,
          severity: severityMap[result.severity] || 'MEDIUM',
          category: 'SSL/TLS Configuration',
          cwe: 'CWE-295',
          cvss: result.cvss || 6.5,
          remediation: result.remediation || `Fix the TLS configuration issue: ${result.title}`,
          metadata: {
            id: result.id,
            cvssScore: result.cvssScore,
            cve: result.cve,
          },
        });
      });

      // Certificate analysis
      if (json.certInfo) {
        const cert = json.certInfo;
        const notAfter = new Date(cert.notAfter);
        const daysRemaining = Math.floor((notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (cert.selfSigned === 'true') {
          findings.push({
            title: 'Self-Signed Certificate',
            description: 'The TLS certificate is self-signed, which is not trusted by browsers.',
            severity: 'HIGH',
            category: 'Certificate Issues',
            cwe: 'CWE-295',
            remediation: 'Replace with a certificate signed by a trusted Certificate Authority.',
          });
        }

        if (daysRemaining < 30 && daysRemaining >= 0) {
          findings.push({
            title: `Certificate Expiring in ${daysRemaining} Days`,
            description: `Certificate expires on ${notAfter.toLocaleDateString()}`,
            severity: 'HIGH',
            category: 'Certificate Issues',
            remediation: 'Renew and deploy the certificate before expiration.',
            metadata: { expiryDate: notAfter.toISOString() },
          });
        } else if (daysRemaining < 0) {
          findings.push({
            title: 'Certificate Expired',
            description: `Certificate expired on ${notAfter.toLocaleDateString()}`,
            severity: 'CRITICAL',
            category: 'Certificate Issues',
            remediation: 'Immediately renew and deploy a new certificate.',
            metadata: { expiryDate: notAfter.toISOString() },
          });
        }
      }
    } catch (e) {
      // JSON parse failed, try text parsing
    }

    return findings;
  }

  /**
   * Parse WhatWeb JSON output (technology fingerprinting)
   */
  static parseWhatwebOutput(output: string): FindingTemplate[] {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    try {
      const json = JSON.parse(output);
      const results = Array.isArray(json) ? json : [json];

      const vulnerableTech = {
        'Apache': ['2.2.0', '2.2.15', '2.4.1'],
        'PHP': ['5.2', '5.3', '5.4', '5.5', '5.6'],
        'WordPress': ['3.0', '3.5', '4.0', '4.1', '4.2'],
        'Joomla': ['1.5', '2.5', '3.0', '3.1', '3.2'],
      };

      results.forEach((result: any) => {
        if (result.plugins) {
          Object.entries(result.plugins).forEach(([plugin, details]: [string, any]) => {
            // Check for known vulnerable versions
            const vulnVersions = vulnerableTech[plugin as keyof typeof vulnerableTech] || [];
            const version = details.version || details[0]?.version;

            if (version && vulnVersions.includes(version)) {
              findings.push({
                title: `Vulnerable ${plugin} Version: ${version}`,
                description: `${plugin} version ${version} contains known security vulnerabilities.`,
                severity: 'HIGH',
                category: 'Outdated Components',
                cwe: 'CWE-1104',
                cvss: 7.5,
                remediation: `Update ${plugin} to the latest stable version.`,
                metadata: { plugin, version, vulnerability: 'Outdated Version' },
              });
            }

            // Info finding for all technologies
            findings.push({
              title: `Technology: ${plugin} ${version ? `v${version}` : ''}`,
              description: `Detected ${plugin}${version ? ` version ${version}` : ''} on target.`,
              severity: 'INFO',
              category: 'Technology Inventory',
              remediation: 'Monitor for vulnerabilities in this technology.',
              metadata: { plugin, version, headers: details.headers },
            });
          });
        }
      });
    } catch (e) {
      // Parsing failed
    }

    return findings;
  }

  /**
   * Parse Nmap XML output (converted to text for simplicity)
   */
  static parseNmapOutput(output: string): FindingTemplate[] {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    const criticalPorts = {
      '22': 'SSH',
      '3389': 'RDP',
      '5432': 'PostgreSQL',
      '27017': 'MongoDB',
      '6379': 'Redis',
      '9200': 'Elasticsearch',
      '5984': 'CouchDB',
      '8080': 'Alt HTTP',
      '8443': 'Alt HTTPS',
      '11211': 'Memcached',
      '50070': 'Hadoop',
    };

    // Parse port lines: "22/tcp open ssh"
    const portRegex = /(\d+)\/tcp\s+(\w+)\s+(\w+)/g;
    let match;
    const seenPorts = new Set<string>();

    while ((match = portRegex.exec(output)) !== null) {
      const port = match[1];
      const state = match[2]; // open, closed, filtered
      const service = match[3];

      if (seenPorts.has(port)) continue;
      seenPorts.add(port);

      if (state === 'open') {
        const isCritical = port in criticalPorts;
        const serviceName = criticalPorts[port as keyof typeof criticalPorts] || service;

        findings.push({
          title: `Open Port: ${port}/${serviceName}`,
          description: `Port ${port} (${serviceName}) is open and accessible from external networks.`,
          severity: isCritical ? 'HIGH' : 'MEDIUM',
          category: 'Network Exposure',
          cwe: 'CWE-200',
          cvss: isCritical ? 7.5 : 5.3,
          remediation: `Restrict access to port ${port} using firewall rules. Consider blocking from the internet if not required.`,
          metadata: {
            port,
            state,
            service: serviceName,
            critical: isCritical,
          },
        });
      } else if (state === 'filtered') {
        findings.push({
          title: `Filtered Port: ${port}/${service}`,
          description: `Port ${port} is filtered by a firewall (good security practice).`,
          severity: 'INFO',
          category: 'Network Configuration',
          remediation: 'Continue monitoring firewall policies.',
        });
      }
    }

    return findings;
  }

  /**
   * Parse Katana endpoint discovery output
   */
  static parseKatanaOutput(output: string): FindingTemplate[] {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    const lines = output.split('\n').filter(l => l.trim());
    const sensitivePatterns = [
      { pattern: /\/admin/i, severity: 'HIGH' as const, desc: 'Admin panel' },
      { pattern: /\/wp-admin/i, severity: 'HIGH' as const, desc: 'WordPress admin' },
      { pattern: /\.git\//i, severity: 'CRITICAL' as const, desc: 'Git repository exposed' },
      { pattern: /\.env/i, severity: 'CRITICAL' as const, desc: 'Environment configuration file' },
      { pattern: /\.sql/i, severity: 'CRITICAL' as const, desc: 'Database backup' },
      { pattern: /\/backup/i, severity: 'HIGH' as const, desc: 'Backup directory' },
      { pattern: /\/private/i, severity: 'HIGH' as const, desc: 'Private directory' },
      { pattern: /\.config/i, severity: 'HIGH' as const, desc: 'Configuration file' },
      { pattern: /\/api\//i, severity: 'MEDIUM' as const, desc: 'API endpoint' },
    ];

    const endpoints = new Map<string, boolean>();

    lines.forEach(line => {
      try {
        const json = JSON.parse(line);
        const url = json.url || line;

        if (!endpoints.has(url)) {
          endpoints.set(url, true);

          // Check for sensitive patterns
          sensitivePatterns.forEach(({ pattern, severity, desc }) => {
            if (pattern.test(url)) {
              findings.push({
                title: `Sensitive Endpoint: ${desc}`,
                description: `Discovered: ${url}`,
                severity,
                category: 'Sensitive Exposure',
                cwe: 'CWE-434',
                remediation: 'Verify access controls. Ensure proper authentication is enforced.',
                metadata: { url, type: desc },
              });
            }
          });
        }
      } catch {}
    });

    findings.push({
      title: `Discovered ${endpoints.size} Endpoints`,
      description: `Web crawling identified ${endpoints.size} unique endpoints`,
      severity: 'INFO',
      category: 'Asset Discovery',
      remediation: 'Review discovered endpoints for security misconfigurations.',
      metadata: { endpointCount: endpoints.size },
    });

    return findings;
  }

  /**
   * Parse Subfinder subdomain discovery output
   */
  static parseSubfinderOutput(output: string): FindingTemplate[] {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    const lines = output.split('\n').filter(l => l.trim());
    const subdomains = new Set<string>();

    lines.forEach(line => {
      try {
        const json = JSON.parse(line);
        if (json.host) {
          subdomains.add(json.host);
        }
      } catch {
        // Plain text subdomain
        if (line && !line.startsWith('[') && !line.startsWith('{')) {
          subdomains.add(line);
        }
      }
    });

    // Group subdomains for findings
    const subdomainsByType = new Map<string, string[]>();
    subdomains.forEach(sub => {
      const parts = sub.split('.');
      const subdomain = parts[0];
      if (!subdomainsByType.has(subdomain)) {
        subdomainsByType.set(subdomain, []);
      }
      subdomainsByType.get(subdomain)!.push(sub);
    });

    // Create findings
    subdomainsByType.forEach((subs, prefix) => {
      findings.push({
        title: `Subdomains Found: ${prefix}.*`,
        description: `Enumerated ${subs.length} subdomains under '${prefix}': ${subs.join(', ')}`,
        severity: 'INFO',
        category: 'Asset Discovery',
        remediation: 'Audit all discovered subdomains for security. Disable or secure unused ones.',
        metadata: { subdomainPrefix: prefix, count: subs.length, subdomains: subs },
      });
    });

    return findings;
  }

  /**
   * Parse httpx live asset detection output
   */
  static parseHttpxOutput(output: string): FindingTemplate[] {
    const findings: FindingTemplate[] = [];
    if (!output.trim()) return findings;

    const lines = output.split('\n').filter(l => l.trim());
    const seen = new Set<string>();

    lines.forEach(line => {
      try {
        const json = JSON.parse(line);
        if (!json.url) return;

        const key = json.url;
        if (seen.has(key)) return;
        seen.add(key);

        // Check status code
        const status = json['status-code'];
        if (status >= 500) {
          findings.push({
            title: `Server Error: ${status}`,
            description: `URL ${json.url} returned HTTP ${status}`,
            severity: 'MEDIUM',
            category: 'HTTP Issues',
            remediation: 'Investigate and fix server-side errors.',
          });
        }

        // Check for information disclosure headers
        const headers = json.headers || {};
        const dangerousHeaders = ['Server', 'X-Powered-By', 'X-AspNet-Version'];
        dangerousHeaders.forEach(header => {
          if (headers[header]) {
            findings.push({
              title: `Information Disclosure: ${header}`,
              description: `Server exposes ${header}: ${headers[header]}`,
              severity: 'LOW',
              category: 'Information Disclosure',
              remediation: `Remove or obscure the ${header} header.`,
            });
          }
        });

        // Check for CORS issues
        const corsHeader = headers['Access-Control-Allow-Origin'];
        if (corsHeader === '*') {
          findings.push({
            title: 'Overly Permissive CORS Policy',
            description: `CORS allows all origins (*) at ${json.url}`,
            severity: 'MEDIUM',
            category: 'CORS Configuration',
            cwe: 'CWE-346',
            remediation: 'Restrict CORS to specific trusted origins.',
          });
        }

        // Technology detection
        if (json.technologies && json.technologies.length > 0) {
          findings.push({
            title: `Technologies: ${json.technologies.join(', ')}`,
            description: `Detected on ${json.url}: ${json.technologies.join(', ')}`,
            severity: 'INFO',
            category: 'Technology Inventory',
            remediation: 'Monitor for vulnerabilities in detected technologies.',
            metadata: { technologies: json.technologies },
          });
        }
      } catch {}
    });

    return findings;
  }

  /**
   * Generic parser for structured results with fallback to text parsing
   */
  static parseGenericOutput(output: string, format: 'json' | 'text' = 'text'): FindingTemplate[] {
    if (format === 'json') {
      try {
        const json = JSON.parse(output);
        const findings: FindingTemplate[] = [];

        if (Array.isArray(json)) {
          json.forEach(item => {
            if (item.title || item.message) {
              findings.push({
                title: item.title || item.message,
                description: item.description || item.details || '',
                severity: (item.severity || 'MEDIUM').toUpperCase() as any,
                category: item.category || 'General',
                remediation: item.remediation || 'Review the finding and apply appropriate remediation.',
              });
            }
          });
        }

        return findings;
      } catch {}
    }

    // Text parsing fallback
    return [];
  }
}

export default AdvancedResultParser;
