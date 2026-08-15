/**
 * SecureLens Engine Catalog (frontend)
 *
 * Display-only engine definitions for the Live Scan / GitHub Scan pages.
 * These are the user-facing names — the raw tool behind each engine is shown as
 * secondary metadata. Each engine carries a Lucide icon and a resource badge.
 *
 * `id` values are kept in sync with the backend so scans still dispatch
 * correctly, but everything the user *sees* is defined here.
 */

export type ResourceUse = 'very-low' | 'low' | 'medium' | 'high';
export type ScanMode = 'website' | 'github' | 'combined';

export interface EngineDef {
  id: string;
  /** User-facing engine name. */
  name: string;
  /** The actual tool/tech behind it (shown as a subtle chip). */
  tool: string;
  /** What it does — one line. */
  description: string;
  /** Lucide icon name (see iconMap in the page). */
  icon: string;
  /** Estimated resource use badge. */
  resource: ResourceUse;
  /** Badge / category label. */
  category: string;
  /** Accent gradient classes for the premium icon tile. */
  accent: string;
  modes: ScanMode[];
}

export const RESOURCE_META: Record<ResourceUse, { label: string; dot: string; cls: string }> = {
  'very-low': { label: 'Very Low', dot: 'bg-emerald-400', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  'low':      { label: 'Low',      dot: 'bg-green-400',   cls: 'bg-green-500/10 text-green-300 border-green-500/20' },
  'medium':   { label: 'Medium',   dot: 'bg-yellow-400',  cls: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
  'high':     { label: 'High',     dot: 'bg-orange-400',  cls: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
};

// ─── Website engines (14) ────────────────────────────────────────────────────
const WEBSITE_ENGINES: EngineDef[] = [
  { id: 'dns_check', name: 'Domain & DNS Check', tool: 'dnsx',
    description: 'Analyzes DNS resolution and domain configuration.',
    icon: 'globe', resource: 'low', category: 'Reconnaissance',
    accent: 'from-sky-500/20 to-blue-600/10 text-sky-300 border-sky-500/25',
    modes: ['website', 'combined'] },
  { id: 'subdomain_discovery', name: 'Subdomain Discovery', tool: 'Subfinder',
    description: 'Discovers publicly known subdomains.',
    icon: 'git-fork', resource: 'low', category: 'Reconnaissance',
    accent: 'from-cyan-500/20 to-teal-600/10 text-cyan-300 border-cyan-500/25',
    modes: ['website', 'combined'] },
  { id: 'asset_discovery', name: 'Live Asset Check', tool: 'httpx',
    description: 'Finds reachable HTTP/HTTPS assets and collects response information.',
    icon: 'radio', resource: 'low', category: 'Asset Discovery',
    accent: 'from-emerald-500/20 to-green-600/10 text-emerald-300 border-emerald-500/25',
    modes: ['website', 'combined'] },
  { id: 'tech_detection', name: 'Technology Detection', tool: 'WhatWeb',
    description: 'Identifies frameworks, CMSs, servers and web technologies.',
    icon: 'cpu', resource: 'low', category: 'Detection',
    accent: 'from-indigo-500/20 to-violet-600/10 text-indigo-300 border-indigo-500/25',
    modes: ['website', 'combined'] },
  { id: 'http_security', name: 'HTTP Security Check', tool: 'SecureLens Native HTTP Engine',
    description: 'Checks security headers, cookies, CORS and redirect configuration.',
    icon: 'shield-check', resource: 'very-low', category: 'Headers & Cookies',
    accent: 'from-violet-500/20 to-purple-600/10 text-violet-300 border-violet-500/25',
    modes: ['website', 'combined'] },
  { id: 'ssl_tls_analysis', name: 'SSL & TLS Security Check', tool: 'testssl.sh',
    description: 'Checks certificates, TLS versions, cipher suites and HTTPS configuration.',
    icon: 'lock', resource: 'medium', category: 'Encryption',
    accent: 'from-amber-500/20 to-orange-600/10 text-amber-300 border-amber-500/25',
    modes: ['website', 'combined'] },
  { id: 'waf_detection', name: 'WAF & Perimeter Defense', tool: 'SecureLens WAF Detector',
    description: 'Detects Web Application Firewalls (Cloudflare, AWS WAF, Akamai) and origin server exposure.',
    icon: 'shield', resource: 'very-low', category: 'Perimeter Defense',
    accent: 'from-orange-500/20 to-amber-600/10 text-orange-300 border-orange-500/25',
    modes: ['website', 'combined'] },
  { id: 'email_security', name: 'Email & Anti-Spoofing Check', tool: 'SecureLens Mail Security',
    description: 'Audits DMARC policies, SPF records, and MX configurations to block phishing.',
    icon: 'mail', resource: 'very-low', category: 'Email Security',
    accent: 'from-blue-500/20 to-cyan-600/10 text-blue-300 border-blue-500/25',
    modes: ['website', 'combined'] },
  { id: 'api_security', name: 'API Security & GraphQL Auditor', tool: 'SecureLens API Auditor',
    description: 'Probes for exposed Swagger/OpenAPI docs, GraphQL introspection, and API rate limiting.',
    icon: 'code', resource: 'low', category: 'API Security',
    accent: 'from-emerald-500/20 to-teal-600/10 text-emerald-300 border-emerald-500/25',
    modes: ['website', 'combined'] },
  { id: 'endpoint_discovery', name: 'Endpoint Discovery', tool: 'Katana',
    description: 'Crawls the application to discover accessible URLs and endpoints.',
    icon: 'search', resource: 'medium', category: 'Crawling',
    accent: 'from-fuchsia-500/20 to-pink-600/10 text-fuchsia-300 border-fuchsia-500/25',
    modes: ['website', 'combined'] },
  { id: 'privacy_compliance', name: 'Privacy & Cookie Compliance', tool: 'SecureLens Privacy Auditor',
    description: 'Audits third-party tracking pixels, persistent cookies, mixed content, and legal notices.',
    icon: 'file-text', resource: 'very-low', category: 'Privacy & Compliance',
    accent: 'from-teal-500/20 to-cyan-600/10 text-teal-300 border-teal-500/25',
    modes: ['website', 'combined'] },
  { id: 'network_exposure', name: 'Network Exposure Check', tool: 'Nmap',
    description: 'Identifies exposed ports and running network services.',
    icon: 'network', resource: 'medium', category: 'Network',
    accent: 'from-rose-500/20 to-red-600/10 text-rose-300 border-rose-500/25',
    modes: ['website', 'combined'] },
  { id: 'vulnerability_detection', name: 'Vulnerability Detection', tool: 'Nuclei',
    description: 'Detects known vulnerabilities, exposures and security misconfigurations.',
    icon: 'bug', resource: 'medium', category: 'Vulnerability',
    accent: 'from-red-500/20 to-rose-600/10 text-red-300 border-red-500/25',
    modes: ['website', 'combined'] },
  { id: 'security_intelligence', name: 'Security Intelligence Engine', tool: 'SecureLens Native Engine',
    description: 'Normalizes, deduplicates, correlates, prioritizes and scores all findings.',
    icon: 'sparkles', resource: 'low', category: 'Correlation',
    accent: 'from-violet-500/20 to-fuchsia-600/10 text-violet-200 border-violet-500/30',
    modes: ['website', 'github', 'combined'] },
];

// ─── GitHub engines (9) ──────────────────────────────────────────────────────
const GITHUB_ENGINES: EngineDef[] = [
  { id: 'repository_overview', name: 'Repository Overview', tool: 'SecureLens Native Analyzer',
    description: 'Detects languages, frameworks, package managers, and security hygiene policies.',
    icon: 'folder-tree', resource: 'very-low', category: 'Overview',
    accent: 'from-sky-500/20 to-blue-600/10 text-sky-300 border-sky-500/25',
    modes: ['github', 'combined'] },
  { id: 'code_security', name: 'Code Security Check', tool: 'Semgrep OSS',
    description: 'Static Application Security Testing (SAST) detecting injection, auth, and code flaws.',
    icon: 'code', resource: 'medium', category: 'Static Analysis',
    accent: 'from-indigo-500/20 to-violet-600/10 text-indigo-300 border-indigo-500/25',
    modes: ['github', 'combined'] },
  { id: 'secret_detection', name: 'Secret Detection', tool: 'Gitleaks',
    description: 'Finds exposed API keys, tokens, passwords, private keys, and cloud credentials.',
    icon: 'key', resource: 'low', category: 'Secrets',
    accent: 'from-rose-500/20 to-red-600/10 text-rose-300 border-rose-500/25',
    modes: ['github', 'combined'] },
  { id: 'dependency_analysis', name: 'Dependency Security Check', tool: 'Trivy',
    description: 'Software Composition Analysis (SCA) detecting known CVEs in application dependencies.',
    icon: 'package', resource: 'medium', category: 'Supply Chain',
    accent: 'from-amber-500/20 to-orange-600/10 text-amber-300 border-amber-500/25',
    modes: ['github', 'combined'] },
  { id: 'infrastructure_security', name: 'Infrastructure Security Check', tool: 'Checkov',
    description: 'Analyzes Terraform configurations, Kubernetes manifests, and cloud infrastructure templates.',
    icon: 'server', resource: 'medium', category: 'IaC',
    accent: 'from-teal-500/20 to-emerald-600/10 text-teal-300 border-teal-500/25',
    modes: ['github', 'combined'] },
  { id: 'cicd_security', name: 'CI/CD & Pipeline Security Check', tool: 'SecureLens CI/CD Auditor',
    description: 'Audits GitHub Actions workflows for script injection, unpinned actions, and excessive permissions.',
    icon: 'shield-check', resource: 'low', category: 'CI/CD Security',
    accent: 'from-emerald-500/20 to-teal-600/10 text-emerald-300 border-emerald-500/25',
    modes: ['github', 'combined'] },
  { id: 'license_compliance', name: 'License & Legal Risk Check', tool: 'SecureLens License Auditor',
    description: 'Detects copyleft licenses (GPL/AGPL), commercial restrictions, and missing license files.',
    icon: 'file-text', resource: 'very-low', category: 'License Compliance',
    accent: 'from-blue-500/20 to-indigo-600/10 text-blue-300 border-blue-500/25',
    modes: ['github', 'combined'] },
  { id: 'container_security', name: 'Container & Dockerfile Security', tool: 'SecureLens Container Hardening',
    description: 'Deep container auditing for root user execution, unpinned base images, and baked secrets.',
    icon: 'box', resource: 'medium', category: 'Container Security',
    accent: 'from-cyan-500/20 to-sky-600/10 text-cyan-300 border-cyan-500/25',
    modes: ['github', 'combined'] },
  { id: 'security_intelligence', name: 'Security Intelligence Engine', tool: 'SecureLens Native Engine',
    description: 'Normalizes, deduplicates, correlates, prioritizes and scores repository findings.',
    icon: 'sparkles', resource: 'low', category: 'Correlation',
    accent: 'from-violet-500/20 to-fuchsia-600/10 text-violet-200 border-violet-500/30',
    modes: ['website', 'github', 'combined'] },
];

export const ENGINE_CATALOG: EngineDef[] = [...WEBSITE_ENGINES, ...GITHUB_ENGINES];

export const ENGINES_BY_MODE: Record<ScanMode, EngineDef[]> = {
  website: WEBSITE_ENGINES,
  github: GITHUB_ENGINES,
  combined: [...WEBSITE_ENGINES, ...GITHUB_ENGINES.filter(e => e.id !== 'security_intelligence')],
};

export function enginesForMode(mode: string): EngineDef[] {
  return ENGINES_BY_MODE[mode as ScanMode] ?? WEBSITE_ENGINES;
}

export function engineById(id: string): EngineDef | undefined {
  return ENGINE_CATALOG.find(e => e.id === id);
}
