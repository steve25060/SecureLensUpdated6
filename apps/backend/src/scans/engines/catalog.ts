/**
 * Engine catalog — single source of truth for scan engines.
 *
 * Why friendly names? Showing raw tool names (nmap, nuclei, gitleaks…) makes the
 * product look like a raw wrapper around CLI tools. Users want to understand
 * *what is being checked*, not which binary does it. So every engine exposes a
 * human-friendly `name` + `description` while keeping an internal `id`.
 *
 * The catalog is shared by:
 *   - ScansController   (GET /scans/engines/*)
 *   - ScansService      (validation + execution)
 *   - the scan executor  (which checks each engine produces)
 */
export type ScanMode = 'website' | 'github' | 'combined';

export interface EngineDefinition {
  /** Stable internal id, stored on Scan.engines[]. */
  id: string;
  /** Human-friendly name shown in the UI. */
  name: string;
  /** One-line description of what it checks. */
  description: string;
  /** High-level category for grouping in the UI. */
  category: string;
  /** Icon key the frontend can map to a lucide icon. */
  icon: string;
  /** Which scan modes this engine applies to. */
  modes: ScanMode[];
}

export const ENGINE_CATALOG: EngineDefinition[] = [
  // ============================================================================
  // STAGE 1: DNS & SUBDOMAIN DISCOVERY
  // ============================================================================
  {
    id: 'dns_check',
    name: 'DNS Resolution',
    description: 'Validates DNS records and resolves domain names to IP addresses.',
    category: 'Asset Discovery',
    icon: 'globe',
    modes: ['website', 'combined'],
  },
  {
    id: 'subdomain_discovery',
    name: 'Subdomain Enumeration',
    description: 'Discovers subdomains using passive sources and API queries.',
    category: 'Asset Discovery',
    icon: 'globe',
    modes: ['website', 'combined'],
  },

  // ============================================================================
  // STAGE 2: LIVE ASSET DETECTION
  // ============================================================================
  {
    id: 'asset_discovery',
    name: 'Live Host Detection',
    description: 'Identifies live HTTP/HTTPS services and probes for technologies.',
    category: 'Asset Discovery',
    icon: 'activity',
    modes: ['website', 'combined'],
  },

  // ============================================================================
  // STAGE 3: TECHNOLOGY DETECTION
  // ============================================================================
  {
    id: 'tech_detection',
    name: 'Technology Fingerprinting',
    description: 'Identifies web frameworks, CMS, plugins, and server software.',
    category: 'Technology Detection',
    icon: 'layers',
    modes: ['website', 'combined'],
  },

  // ============================================================================
  // STAGE 4: SSL/TLS ANALYSIS
  // ============================================================================
  {
    id: 'ssl_tls_analysis',
    name: 'SSL/TLS Analysis',
    description: 'Comprehensive analysis of SSL/TLS configuration and certificate strength.',
    category: 'Encryption',
    icon: 'lock',
    modes: ['website', 'combined'],
  },

  // ============================================================================
  // STAGE 5: ENDPOINT DISCOVERY
  // ============================================================================
  {
    id: 'endpoint_discovery',
    name: 'Endpoint Discovery',
    description: 'Web crawling to discover API endpoints, forms, and sensitive pages.',
    category: 'Asset Discovery',
    icon: 'map',
    modes: ['website', 'combined'],
  },

  // ============================================================================
  // STAGE 6: NETWORK EXPOSURE MAPPING
  // ============================================================================
  {
    id: 'network_exposure',
    name: 'Network Port Scanning',
    description: 'Comprehensive port scanning and service enumeration.',
    category: 'Network Reconnaissance',
    icon: 'network',
    modes: ['website', 'combined'],
  },

  // ============================================================================
  // STAGE 7: VULNERABILITY DETECTION & NATIVE AUDITING
  // ============================================================================
  {
    id: 'vulnerability_detection',
    name: 'Vulnerability Scanning',
    description: 'Template-based vulnerability scanning for CVEs and misconfigurations.',
    category: 'Vulnerability Detection',
    icon: 'bug',
    modes: ['website', 'combined'],
  },
  {
    id: 'http_security',
    name: 'HTTP Security Check',
    description: 'Audits security headers (CSP, HSTS, X-Frame), cookies, and CORS policies.',
    category: 'Headers & Cookies',
    icon: 'shield-check',
    modes: ['website', 'combined'],
  },
  {
    id: 'api_security',
    name: 'API Security & GraphQL Auditor',
    description: 'Probes for exposed Swagger/OpenAPI docs, GraphQL introspection, and API rate limiting.',
    category: 'API Security',
    icon: 'code',
    modes: ['website', 'combined'],
  },
  {
    id: 'waf_detection',
    name: 'WAF & Perimeter Defense',
    description: 'Detects Web Application Firewalls (Cloudflare, AWS WAF, Akamai) and origin server exposure.',
    category: 'Perimeter Defense',
    icon: 'shield',
    modes: ['website', 'combined'],
  },
  {
    id: 'email_security',
    name: 'Email & Anti-Spoofing Check',
    description: 'Audits DMARC policies, SPF records, and MX configurations to prevent domain spoofing and phishing.',
    category: 'Email Security',
    icon: 'mail',
    modes: ['website', 'combined'],
  },
  {
    id: 'privacy_compliance',
    name: 'Privacy & Cookie Compliance',
    description: 'Audits third-party tracking pixels, persistent cookies, mixed content, and legal privacy notices.',
    category: 'Privacy & Compliance',
    icon: 'file-text',
    modes: ['website', 'combined'],
  },
  {
    id: 'security_intelligence',
    name: 'Security Intelligence Engine',
    description: 'Normalizes, deduplicates, correlates, prioritizes and scores all findings.',
    category: 'Correlation',
    icon: 'sparkles',
    modes: ['website', 'github', 'combined'],
  },

  // ============================================================================
  // LEGACY ENGINES (kept for backward compatibility)
  // ============================================================================
  {
    id: 'port_scanner',
    name: 'Port Scanner (Legacy)',
    description: 'Finds open ports and running services on the target host.',
    category: 'Network Reconnaissance',
    icon: 'network',
    modes: ['website', 'combined'],
  },
  {
    id: 'website_finder',
    name: 'Website Finder (Legacy)',
    description: 'Discovers live hosts, subdomains, and hidden endpoints.',
    category: 'Asset Discovery',
    icon: 'globe',
    modes: ['website', 'combined'],
  },
  {
    id: 'vulnerability_scanner',
    name: 'Vulnerability Scanner (Legacy)',
    description: 'Detects known CVEs, injections, and misconfigurations.',
    category: 'Vulnerability Detection',
    icon: 'bug',
    modes: ['website', 'github', 'combined'],
  },
  {
    id: 'website_info',
    name: 'Website Info (Legacy)',
    description: 'Identifies technologies, frameworks, and server software.',
    category: 'Technology Detection',
    icon: 'info',
    modes: ['website', 'combined'],
  },
  {
    id: 'ssl_checker',
    name: 'SSL Checker (Legacy)',
    description: 'Analyzes TLS/SSL certificate strength and configuration.',
    category: 'Encryption',
    icon: 'lock',
    modes: ['website', 'combined'],
  },
  // ============================================================================
  // GITHUB REPOSITORY SCANNING ENGINES
  // ============================================================================
  {
    id: 'repository_overview',
    name: 'Repository Overview',
    description: 'Detects languages, frameworks, package managers, and repository structure.',
    category: 'Repository Overview',
    icon: 'folder-tree',
    modes: ['github', 'combined'],
  },
  {
    id: 'code_security',
    name: 'Code Security Check',
    description: 'Static Application Security Testing (SAST) for source code vulnerabilities using Semgrep OSS.',
    category: 'Static Analysis',
    icon: 'code',
    modes: ['github', 'combined'],
  },
  {
    id: 'secret_detection',
    name: 'Secret Detection',
    description: 'Scans commit history and codebase for leaked API keys, tokens, and credentials using Gitleaks.',
    category: 'Secret Detection',
    icon: 'key',
    modes: ['github', 'combined'],
  },
  {
    id: 'dependency_analysis',
    name: 'Dependency Security Check',
    description: 'Software Composition Analysis (SCA) for known package vulnerabilities using Trivy.',
    category: 'Supply Chain',
    icon: 'box',
    modes: ['github', 'combined'],
  },
  {
    id: 'infrastructure_security',
    name: 'Infrastructure Security Check',
    description: 'Infrastructure-as-Code (IaC) security auditing for Terraform, Kubernetes, and CloudFormation using Checkov.',
    category: 'Infrastructure as Code',
    icon: 'server',
    modes: ['github', 'combined'],
  },
  {
    id: 'cicd_security',
    name: 'CI/CD & Pipeline Security Check',
    description: 'Audits GitHub Actions workflows for script injection, unpinned actions, and permissive permissions.',
    category: 'CI/CD Security',
    icon: 'shield-check',
    modes: ['github', 'combined'],
  },
  {
    id: 'license_compliance',
    name: 'License & Legal Risk Check',
    description: 'Audits open-source licenses for copyleft risks (GPL/AGPL), commercial restrictions, and license compliance.',
    category: 'License Compliance',
    icon: 'file-text',
    modes: ['github', 'combined'],
  },
  {
    id: 'container_security',
    name: 'Container & Dockerfile Security',
    description: 'Deep container security scanning for root execution, unpinned base images, and leaked build secrets.',
    category: 'Container Security',
    icon: 'box',
    modes: ['github', 'combined'],
  },

  // ============================================================================
  // LEGACY ALIASES (kept for backward compatibility)
  // ============================================================================
  {
    id: 'code_scanner',
    name: 'Code Scanner (Semgrep)',
    description: 'Scans source code for insecure patterns and injection risks.',
    category: 'Static Analysis',
    icon: 'code',
    modes: ['github', 'combined'],
  },
  {
    id: 'container_checker',
    name: 'Container Checker (Trivy)',
    description: 'Inspects dependencies and container images for known flaws.',
    category: 'Supply Chain',
    icon: 'box',
    modes: ['github', 'combined'],
  },
  {
    id: 'secret_finder',
    name: 'Secret Finder (Gitleaks)',
    description: 'Hunts for leaked API keys, tokens, and passwords in code.',
    category: 'Secret Detection',
    icon: 'key',
    modes: ['github', 'combined'],
  },
  {
    id: 'results_cleaner',
    name: 'Results Cleaner',
    description: 'De-duplicates and correlates findings from all engines.',
    category: 'Correlation',
    icon: 'filter',
    modes: ['website', 'github', 'combined'],
  },
];

export const ENGINES_BY_MODE: Record<ScanMode, EngineDefinition[]> = {
  website: ENGINE_CATALOG.filter(e => e.modes.includes('website')),
  github: ENGINE_CATALOG.filter(e => e.modes.includes('github')),
  combined: ENGINE_CATALOG.filter(e => e.modes.includes('combined')),
};

export function enginesForMode(mode: string): EngineDefinition[] {
  return ENGINES_BY_MODE[mode as ScanMode] ?? ENGINE_CATALOG;
}

export function engineById(id: string): EngineDefinition | undefined {
  return ENGINE_CATALOG.find(e => e.id === id);
}

export function isValidEngineId(id: string): boolean {
  return ENGINE_CATALOG.some(e => e.id === id);
}

/** IDs that are valid for a given mode. */
export function validEngineIdsForMode(mode: string): string[] {
  return enginesForMode(mode).map(e => e.id);
}
