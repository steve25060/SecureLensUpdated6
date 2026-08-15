import { FindingTemplate } from './engine-commands-advanced';

/**
 * Normalization Layer for SecureLens
 * Converts disparate finding formats into unified schema
 * Maps severity levels, categories, and CWE/CVSS scores
 */

export interface NormalizedFinding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  subcategory?: string;
  cwe?: string;
  cvss?: number;
  cvssVector?: string;
  owasp?: string;
  remediation: string;
  evidence?: string[];
  tags: string[];
  references?: string[];
  tool: string;
  timestamp: Date;
}

export class NormalizationLayer {
  /**
   * Severity mapping across different tools
   */
  private static readonly SEVERITY_MAP: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'> = {
    // Nuclei
    'critical': 'CRITICAL',
    'high': 'HIGH',
    'medium': 'MEDIUM',
    'low': 'LOW',
    'info': 'INFO',

    // testssl.sh (uppercase variants)
    'CRITICAL': 'CRITICAL',
    'HIGH': 'HIGH',
    'MEDIUM': 'MEDIUM',
    'LOW': 'LOW',
    'WARN': 'HIGH',
    'OK': 'INFO',
  };

  /**
   * Category standardization
   */
  private static readonly CATEGORY_NORMALIZE: Record<string, string> = {
    'vulnerability': 'Vulnerability Detection',
    'cve': 'Vulnerability Detection',
    'injection': 'Vulnerability Detection',
    'xss': 'Vulnerability Detection',
    'sqli': 'Vulnerability Detection',
    'rce': 'Vulnerability Detection',

    'network': 'Network Exposure',
    'port': 'Network Exposure',
    'open port': 'Network Exposure',

    'ssl': 'SSL/TLS Configuration',
    'tls': 'SSL/TLS Configuration',
    'certificate': 'SSL/TLS Configuration',

    'technology': 'Technology Inventory',
    'framework': 'Technology Inventory',
    'cms': 'Technology Inventory',

    'subdomain': 'Asset Discovery',
    'endpoint': 'Asset Discovery',
    'asset': 'Asset Discovery',

    'configuration': 'Misconfiguration',
    'misconfig': 'Misconfiguration',

    'authentication': 'Authentication Issues',
    'authorization': 'Authorization Issues',

    'information disclosure': 'Information Disclosure',
    'exposure': 'Information Disclosure',

    'cors': 'CORS Configuration',
    'header': 'Security Headers',

    'code': 'Static Analysis',
    'dependency': 'Supply Chain',
    'secret': 'Secret Exposure',
  };

  /**
   * CWE ID standardization and mapping
   */
  private static readonly CWE_MAPPINGS: Record<string, string> = {
    // Injection
    'sql injection': 'CWE-89',
    'sqli': 'CWE-89',
    'nosql injection': 'CWE-943',
    'command injection': 'CWE-78',
    'template injection': 'CWE-1336',

    // XSS
    'xss': 'CWE-79',
    'cross-site scripting': 'CWE-79',
    'reflected xss': 'CWE-79',
    'stored xss': 'CWE-79',
    'dom xss': 'CWE-79',

    // Authentication
    'weak password': 'CWE-521',
    'default credentials': 'CWE-798',
    'broken authentication': 'CWE-287',

    // SSL/TLS
    'weak ssl': 'CWE-295',
    'weak tls': 'CWE-295',
    'certificate': 'CWE-295',
    'expired certificate': 'CWE-295',

    // Crypto
    'weak crypto': 'CWE-327',
    'hardcoded secret': 'CWE-798',
    'exposed key': 'CWE-798',

    // Access Control
    'cors': 'CWE-346',
    'broken access control': 'CWE-284',

    // Configuration
    'exposed': 'CWE-434',
    '.git': 'CWE-434',
    '.env': 'CWE-434',
  };

  /**
   * OWASP Top 10 mapping
   */
  private static readonly OWASP_MAPPING: Record<string, string> = {
    'injection': 'A03:2021 – Injection',
    'sqli': 'A03:2021 – Injection',
    'xss': 'A07:2021 – Cross-Site Scripting (XSS)',
    'authentication': 'A07:2021 – Identification and Authentication Failures',
    'broken access': 'A01:2021 – Broken Access Control',
    'csrf': 'A04:2021 – Insecure Deserialization',
    'external entity': 'A05:2021 – Security Misconfiguration',
    'vulnerable dependency': 'A06:2021 – Vulnerable and Outdated Components',
  };

  /**
   * Normalize a finding from any tool to standard format
   */
  static normalizeFinding(
    finding: FindingTemplate & { source?: string; tool?: string }
  ): NormalizedFinding {
    const id = `${finding.source || finding.tool || 'unknown'}:${this.hashString(finding.title)}`;

    return {
      id,
      title: finding.title.trim(),
      description: finding.description.trim(),
      severity: this.normalizeSeverity(finding.severity),
      category: this.normalizeCategory(finding.category),
      subcategory: finding.category,
      cwe: this.normalizeCWE(finding.cwe, finding.title, finding.category),
      cvss: this.normalizeCVSS(finding.cvss),
      cvssVector: this.generateCVSSVector(finding.severity, finding.cwe),
      owasp: this.mapToOWASP(finding.title, finding.category),
      remediation: finding.remediation.trim(),
      evidence: this.extractEvidence(finding.description),
      tags: this.generateTags(finding),
      references: this.extractReferences(finding.description),
      tool: finding.source || finding.tool || 'unknown',
      timestamp: new Date(),
    };
  }

  /**
   * Normalize severity level
   */
  private static normalizeSeverity(
    severity: string
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
    const normalized = severity.toLowerCase();
    return this.SEVERITY_MAP[normalized] || 'MEDIUM';
  }

  /**
   * Normalize category
   */
  private static normalizeCategory(category: string): string {
    const normalized = category.toLowerCase();
    for (const [key, value] of Object.entries(this.CATEGORY_NORMALIZE)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
    return category;
  }

  /**
   * Normalize CWE ID
   */
  private static normalizeCWE(
    cwe: string | undefined,
    title: string,
    category: string
  ): string | undefined {
    if (cwe) {
      if (cwe.startsWith('CWE-')) return cwe;
      return `CWE-${cwe}`;
    }

    // Infer from title/category
    const combined = `${title} ${category}`.toLowerCase();
    for (const [key, value] of Object.entries(this.CWE_MAPPINGS)) {
      if (combined.includes(key)) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Normalize CVSS score (0-10)
   */
  private static normalizeCVSS(cvss: number | undefined): number | undefined {
    if (cvss === undefined || cvss === null) return undefined;
    if (typeof cvss !== 'number') return undefined;
    
    // Clamp to 0-10 range
    return Math.max(0, Math.min(10, cvss));
  }

  /**
   * Generate CVSS vector string from severity + CWE
   */
  private static generateCVSSVector(severity: string, cwe: string | undefined): string {
    const severityToCVSS: Record<string, number> = {
      'CRITICAL': 9.5,
      'HIGH': 7.5,
      'MEDIUM': 5.5,
      'LOW': 3.0,
      'INFO': 0,
    };

    const cvss = severityToCVSS[severity] || 5.5;

    // Basic CVSS v3.1 vector
    // Note: This is simplified; real CVSS requires more parameters
    const scope = cvss >= 7 ? 'C' : 'U';
    const impact = severity === 'CRITICAL' ? 'H' : severity === 'HIGH' ? 'H' : 'L';

    return `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:${scope}/C:${impact}/I:${impact}/A:${impact}`;
  }

  /**
   * Map to OWASP category
   */
  private static mapToOWASP(title: string, category: string): string | undefined {
    const combined = `${title} ${category}`.toLowerCase();
    for (const [key, value] of Object.entries(this.OWASP_MAPPING)) {
      if (combined.includes(key)) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Extract evidence/affected items from description
   */
  private static extractEvidence(description: string): string[] {
    const evidence: string[] = [];

    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = description.match(urlRegex);
    if (urls) evidence.push(...urls);

    // IP addresses
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ips = description.match(ipRegex);
    if (ips) evidence.push(...ips);

    // CVE IDs
    const cveRegex = /(CVE-\d{4}-\d{4,5})/g;
    const cves = description.match(cveRegex);
    if (cves) evidence.push(...cves);

    return evidence;
  }

  /**
   * Generate tags from finding properties
   */
  private static generateTags(finding: FindingTemplate & { source?: string; tool?: string }): string[] {
    const tags: string[] = [];

    // Tool tag
    tags.push(`tool:${finding.source || finding.tool || 'unknown'}`);

    // Severity tag
    tags.push(`severity:${finding.severity}`);

    // Category-based tags
    const category = finding.category.toLowerCase();
    if (category.includes('vulnerability')) tags.push('vulnerability');
    if (category.includes('network')) tags.push('network');
    if (category.includes('ssl') || category.includes('tls')) tags.push('encryption');
    if (category.includes('authentication')) tags.push('auth');
    if (category.includes('configuration')) tags.push('config');
    if (category.includes('exposure')) tags.push('exposure');
    if (category.includes('misconfig')) tags.push('misconfiguration');

    // CWE-based tags
    if (finding.cwe) {
      tags.push(`cwe:${finding.cwe}`);
    }

    // Title-based tags
    const titleLower = finding.title.toLowerCase();
    if (titleLower.includes('outdated')) tags.push('outdated');
    if (titleLower.includes('weak')) tags.push('weak');
    if (titleLower.includes('expired')) tags.push('expired');
    if (titleLower.includes('default')) tags.push('default-creds');
    if (titleLower.includes('header')) tags.push('header');
    if (titleLower.includes('cors')) tags.push('cors');

    return tags;
  }

  /**
   * Extract references from description (CVEs, URLs, etc.)
   */
  private static extractReferences(description: string): string[] {
    const refs: string[] = [];

    // CVE references
    const cveRegex = /(CVE-\d{4}-\d{4,5})/g;
    const cves = description.match(cveRegex);
    if (cves) {
      refs.push(...cves.map(cve => `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cve}`));
    }

    // CWE references
    const cweRegex = /(CWE-\d+)/g;
    const cwes = description.match(cweRegex);
    if (cwes) {
      refs.push(...cwes.map(cwe => `https://cwe.mitre.org/data/definitions/${cwe.split('-')[1]}.html`));
    }

    return refs;
  }

  /**
   * Simple hash function for ID generation
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Normalize multiple findings
   */
  static normalizeFindings(
    findings: Array<FindingTemplate & { source?: string; tool?: string }>
  ): NormalizedFinding[] {
    return findings.map(f => this.normalizeFinding(f));
  }

  /**
   * Apply additional context enrichment
   */
  static enrichFinding(finding: NormalizedFinding, context?: Record<string, any>): NormalizedFinding {
    return {
      ...finding,
      ...context,
      timestamp: new Date(),
    };
  }

  /**
   * Batch normalize and deduplicate findings
   */
  static normalizeBatch(
    findings: Array<FindingTemplate & { source?: string; tool?: string }>
  ): NormalizedFinding[] {
    const normalized = this.normalizeFindings(findings);
    const deduplicated = new Map<string, NormalizedFinding>();

    normalized.forEach(finding => {
      // Use category + title as dedup key
      const key = `${finding.category}:${finding.title}`;
      if (!deduplicated.has(key)) {
        deduplicated.set(key, finding);
      }
    });

    return Array.from(deduplicated.values());
  }
}

export default NormalizationLayer;
