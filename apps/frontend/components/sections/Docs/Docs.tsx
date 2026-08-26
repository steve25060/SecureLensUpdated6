'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, X, Copy, Check, ChevronRight,
  Terminal, FileCode, CheckCircle2, Share2, Wrench, Rocket,
  Shield, Zap, Code2, Globe, Cpu, ArrowRight, Layers, Sparkles
} from 'lucide-react';
import { ShiningText } from '@/components/common/ShiningText';

export interface DocTopic {
  id: string;
  title: string;
  badge: string;
  description: string;
  icon: string;
  readTime: string;
  overview: string;
  sections: {
    heading: string;
    content: string;
    codeSnippet?: {
      language: string;
      code: string;
    };
    keyPoints?: string[];
  }[];
}

export const DOC_TOPICS: DocTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    badge: 'Quickstart',
    description: 'Learn how to configure SecureLens, set up workspaces, and run your first multi-vector scan in under 2 minutes.',
    icon: '🚀',
    readTime: '3 min read',
    overview: 'SecureLens unifies Dynamic Application Security Testing (DAST), Static Code Analysis (SAST), Secret Hunting, and Cloud Posture into a single automated security intelligence pipeline.',
    sections: [
      {
        heading: '1. Workspace Setup & Target Definition',
        content: 'Workspaces group your web applications, API endpoints, cloud perimeters, and GitHub repositories into isolated security scopes with dedicated risk scoring and history tracking.',
        keyPoints: [
          'Navigate to Dashboard → Workspaces to add a new production or staging target.',
          'Specify your Website URL (e.g. https://example.com) or GitHub repository link.',
          'Workspaces automatically synchronize configurations across Live Scan and AI Copilot.'
        ]
      },
      {
        heading: '2. Selecting Scan Modes & Intensity Profiles',
        content: 'Choose from 3 specialized scanning modes and calibrated profiles tailored for your infrastructure:',
        keyPoints: [
          '🌐 Website DAST: External attack surface mapping, SSL/TLS cipher audits, security headers, open ports, and web application CVE probing.',
          '💻 GitHub SAST: Deep static code analysis, leaked secrets/credentials hunting, and software supply chain dependency audits.',
          '⚡ Combined Full-Stack: Comprehensive multi-vector audit correlating perimeter exposure with underlying source code vulnerabilities.',
          'Profiles available: Fast Recon (30s), Standard Balanced (2m), Deep Aggressive Audit (4m), and Compliance Matrix.'
        ],
        codeSnippet: {
          language: 'bash',
          code: `# Launch an automated multi-vector scan via SecureLens API
curl -X POST https://securelens-backend-o213.onrender.com/api/scans/website \\
  -H "Authorization: Bearer <YOUR_SECURELENS_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target": "https://example.com",
    "mode": "website",
    "profile": "normal",
    "engines": [
      "dns_check",
      "asset_discovery",
      "ssl_tls_analysis",
      "vulnerability_detection",
      "http_security",
      "api_security"
    ]
  }'`
        }
      },
      {
        heading: '3. Real-Time Telemetry & AI Finding Correlation',
        content: 'Monitor live terminal outputs as SecureLens engines execute in parallel. Once completed, the Security Intelligence Engine correlates alerts, deduplicates findings, calculates an updated 0-100 Security Posture Score, and generates AI-assisted remediation patches.'
      }
    ]
  },
  {
    id: 'templates-guide',
    title: 'Templates Guide',
    badge: 'Custom Rules',
    description: 'Explore, author, and deploy custom vulnerability scanning templates and declarative rulesets.',
    icon: '📋',
    readTime: '5 min read',
    overview: 'SecureLens provides an extensible declarative template engine allowing security teams to author custom vulnerability detectors, proprietary API checks, and corporate compliance guardrails in YAML.',
    sections: [
      {
        heading: 'Authoring Declarative Security Templates',
        content: 'Define custom protocols, HTTP matchers, word/regex extractors, and severity levels to detect proprietary endpoints, exposed secrets, or compliance violations:',
        codeSnippet: {
          language: 'yaml',
          code: `id: securelens-custom-auth-bypass-check
info:
  name: Unsigned JWT Token & Alg None Acceptance
  author: securelens-security
  severity: critical
  description: Detects API endpoints accepting forged or unsigned JSON Web Tokens
  remediation: Ensure JWT verification strictly enforces cryptographic signature algorithms (e.g. RS256/HS256).
  tags: [jwt, auth, api, custom]

http:
  - method: GET
    path:
      - "{{BaseURL}}/api/v1/auth/verify"
      - "{{BaseURL}}/api/v1/user/profile"
    headers:
      Authorization: "Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0."
    matchers-condition: and
    matchers:
      - type: status
        status: [200]
      - type: word
        words:
          - '"authenticated":true'
          - '"role":"admin"'`
        }
      },
      {
        heading: 'Custom Static Code Rulesets (SAST)',
        content: 'Create pattern-based AST rules to catch insecure coding patterns, unparameterized database queries, hardcoded credentials, or disabled SSL verification in source repositories.'
      },
      {
        heading: 'Built-in Rule Packs & Profile Presets',
        content: 'Select from pre-configured scanning rule packs optimized for specific audit scenarios:',
        keyPoints: [
          '🛡️ OWASP Top 10 Core Pack: Injection flaws (SQLi/XSS), SSRF, IDOR, and Broken Access Control.',
          '☁️ Cloud & API Perimeter Pack: GraphQL introspection, Swagger document exposure, and CORS misconfigurations.',
          '🔑 Supply Chain & Secrets Guard: Comprehensive pattern library detecting 120+ cloud tokens, API keys, and private certs.',
          '📜 Regulatory Compliance Pack: Audits headers and security configurations against PCI-DSS, HIPAA, and GDPR standards.'
        ]
      }
    ]
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    badge: 'REST & WebSockets',
    description: 'Complete API endpoints documentation for CI/CD automation, custom integrations, and data exports.',
    icon: '⚙️',
    readTime: '4 min read',
    overview: 'Integrate SecureLens programmatically into your CI/CD pipelines, internal security dashboards, and SIEM systems using our high-throughput REST API.',
    sections: [
      {
        heading: 'Authentication & Base Configuration',
        content: 'Include your JWT token or Organization API key in the Authorization header of every request:',
        codeSnippet: {
          language: 'http',
          code: `POST /api/scans/website HTTP/1.1
Host: securelens-backend-o213.onrender.com
Authorization: Bearer <YOUR_SECURELENS_API_KEY>
Content-Type: application/json`
        }
      },
      {
        heading: 'Core API Endpoint Directory',
        content: 'Key REST endpoints for orchestrating scans, streaming telemetry, and querying findings:',
        keyPoints: [
          'POST /api/auth/login — User authentication and JWT generation.',
          'POST /api/scans/website — Initiate a dynamic web application vulnerability scan.',
          'POST /api/scans/github — Initiate static code analysis and dependency audit on a git repository.',
          'GET /api/scans — Retrieve scan history, filter by status, target, and risk score.',
          'GET /api/scans/:id — Query real-time scan progress, active phase, and telemetry logs.',
          'GET /api/findings — Query correlated security findings with severity, CVE, and category filters.',
          'POST /api/ai/chat — Request AI Copilot remediation patches and guided code fixes.',
          'GET /api/reports/:id/pdf — Export formal executive and compliance audit reports in PDF.'
        ]
      },
      {
        heading: 'Standardized Finding Response Schema',
        content: 'All findings are normalized under a unified schema with CVSS scores, CWE mappings, and remediation guidance:',
        codeSnippet: {
          language: 'json',
          code: `{
  "id": "find_8b91a20c",
  "scanId": "scan_4f92c10a",
  "title": "Missing Content-Security-Policy (CSP) Header",
  "severity": "MEDIUM",
  "category": "Headers & Cookies",
  "cvss": 5.4,
  "cwe": "CWE-693",
  "target": "https://example.com",
  "description": "The web server response does not include a Content-Security-Policy header, leaving the application vulnerable to cross-site scripting (XSS).",
  "remediation": "Configure a strict Content-Security-Policy response header restricting script and object sources.",
  "status": "OPEN",
  "createdAt": "2026-08-26T15:00:00.000Z"
}`
        }
      }
    ]
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    badge: 'Security Guide',
    description: 'Security scanning methodologies, automated guardrails, and optimization techniques.',
    icon: '✓',
    readTime: '4 min read',
    overview: 'Maximize security posture while eliminating false positive alert fatigue by adhering to proactive DevSecOps practices.',
    sections: [
      {
        heading: '1. Shift-Left Security Pipeline',
        content: 'Catch secret leaks and vulnerable dependencies before code is merged into production branches:',
        keyPoints: [
          'Run SecureLens Secret Hunter and Static Application Security Testing (SAST) engines on every pull request.',
          'Enforce automated merge blocking if Critical CVEs or hardcoded credentials are detected.',
          'Schedule automated weekly baseline scans for all deployed staging and production endpoints.'
        ]
      },
      {
        heading: '2. Remediation SLAs by Severity',
        content: 'Establish clear internal SLAs for vulnerability resolution:',
        keyPoints: [
          '🔴 Critical (Score 9.0–10.0): Remediate or apply mitigation within 24 hours.',
          '🟠 High (Score 7.0–8.9): Remediate within 7 calendar days.',
          '🟡 Medium (Score 4.0–6.9): Resolve within the standard 2-week sprint cycle.',
          '🔵 Low / Informational: Address during regular maintenance and technical debt cycles.'
        ]
      },
      {
        heading: '3. Safe Production Scanning Protocols',
        content: 'When scanning live production surfaces, use Fast Recon or Standard Balanced profiles to ensure non-invasive auditing without latency spikes, and schedule deep crawls during off-peak maintenance windows.'
      }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    badge: 'CI/CD & DevOps',
    description: 'Connect SecureLens with GitHub Actions, GitLab CI, Slack alerts, and issue trackers.',
    icon: '🔗',
    readTime: '3 min read',
    overview: 'Embed continuous security testing seamlessly into your existing developer toolchains and notification channels.',
    sections: [
      {
        heading: 'GitHub Actions Workflow Integration',
        content: 'Add automated security gating to your repository with a single workflow file:',
        codeSnippet: {
          language: 'yaml',
          code: `name: SecureLens Security Gate
on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main ]

jobs:
  security-audit:
    name: SecureLens Automated Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Trigger SecureLens SAST & Secret Scan
        run: |
          curl -s -X POST https://securelens-backend-o213.onrender.com/api/scans/github \\
            -H "Authorization: Bearer \${{ secrets.SECURELENS_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "repoUrl": "\${{ github.server_url }}/\${{ github.repository }}",
              "mode": "github",
              "profile": "normal"
            }'`
        }
      },
      {
        heading: 'Alerting & Webhook Ecosystem',
        content: 'SecureLens natively connects with your operational notification channels:',
        keyPoints: [
          '🔔 Slack & Microsoft Teams: Real-time webhook notifications for Critical & High security alerts.',
          '📋 Jira & Linear: One-click export of findings into trackable engineering bug tickets with remediation diffs.',
          '🐳 Container & Docker Registries: Continuous image auditing via SecureLens Container Security Engine.',
          '📊 SIEM & Analytics: Stream structured finding telemetry to centralized log systems via webhooks.'
        ]
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    badge: 'Resolution Guide',
    description: 'Diagnostic guides and solutions for common connection, hibernation, and scan execution scenarios.',
    icon: '🔧',
    readTime: '3 min read',
    overview: 'Quick answers and remediation steps for network connectivity, authentication, and scan execution questions.',
    sections: [
      {
        heading: 'Render Cloud Free-Tier Hibernation (502 / 503)',
        content: 'Free cloud containers go into sleep mode after 15 minutes of inactivity. When a request is received, the host initiates a cold start which takes 30-50 seconds:',
        keyPoints: [
          'Wait 30-45 seconds on initial load while the backend container wakes up.',
          'SecureLens includes an automatic retry client and offline fallback mode so the UI remains fully responsive.',
          'Once awake, subsequent scans and API requests respond in sub-seconds.'
        ]
      },
      {
        heading: 'OAuth Redirect & Callback Configuration',
        content: 'If Google or GitHub login returns an error, verify that the Authorized Redirect URI in your developer console matches your deployment URL:',
        codeSnippet: {
          language: 'text',
          code: `Authorized Redirect URIs:
https://securelens-backend-o213.onrender.com/api/auth/google/callback
https://securelens-backend-o213.onrender.com/api/auth/github/callback
https://securelens-frontend.onrender.com/callback`
        }
      },
      {
        heading: 'Large Repository Performance Optimization',
        content: 'For codebases containing over 50,000 files, ensure build artifacts (dist, node_modules, .git, vendor) are excluded from static analysis to optimize scan execution times.'
      }
    ]
  }
];

export default function Docs() {
  const [selectedTopic, setSelectedTopic] = useState<DocTopic | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(code);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <section id="docs" className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a0d1a] to-slate-950 py-24">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full mix-blend-screen filter blur-3xl" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            <ShiningText>Documentation</ShiningText>
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto font-normal">
            Everything you need to master SecureLens, automate security scanning, and remediate vulnerabilities at speed.
          </p>
        </motion.div>

        {/* Docs Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
        >
          {DOC_TOPICS.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              viewport={{ once: true }}
              onClick={() => setSelectedTopic(doc)}
              className="group relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />

              <div className="relative bg-[#0b1020]/80 border border-white/10 group-hover:border-violet-400/40 rounded-2xl p-6 backdrop-blur transition-all duration-300 h-full flex flex-col justify-between hover:shadow-2xl hover:shadow-violet-950/30">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl p-2 rounded-xl bg-white/[0.03] border border-white/5">{doc.icon}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {doc.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
                    {doc.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-violet-400 group-hover:text-violet-300 font-medium text-sm">
                  <span className="flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                    Explore Guide <ChevronRight className="w-4 h-4" />
                  </span>
                  <span className="text-xs text-gray-400">{doc.readTime}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ─── Interactive Documentation Drawer Modal ───────────────────────── */}
      <AnimatePresence>
        {selectedTopic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTopic(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c1222] border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col overflow-hidden z-10"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/10 bg-slate-900/90 backdrop-blur flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTopic.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">{selectedTopic.title}</h2>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30">
                        {selectedTopic.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedTopic.readTime} • Documentation & Guides</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Topic Tabs inside Modal */}
              <div className="px-6 py-2.5 bg-slate-950/60 border-b border-white/5 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
                {DOC_TOPICS.map(topic => {
                  const isActive = topic.id === selectedTopic.id;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}
                    >
                      <span>{topic.icon}</span>
                      {topic.title}
                    </button>
                  );
                })}
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-8 text-gray-200 scrollbar-thin">
                {/* Overview Banner */}
                <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/20 text-violet-200 text-sm leading-relaxed flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white mb-1">Guide Overview</p>
                    <p>{selectedTopic.overview}</p>
                  </div>
                </div>

                {/* Main Sections */}
                {selectedTopic.sections.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      {section.heading}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{section.content}</p>

                    {/* Key Points */}
                    {section.keyPoints && section.keyPoints.length > 0 && (
                      <ul className="space-y-2 mt-3 pl-2">
                        {section.keyPoints.map((point, ptIdx) => (
                          <li key={ptIdx} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Code Snippet Box */}
                    {section.codeSnippet && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-[#050814]">
                        <div className="px-4 py-2 bg-slate-900/80 border-b border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
                          <span>{section.codeSnippet.language.toUpperCase()}</span>
                          <button
                            onClick={() => handleCopy(section.codeSnippet!.code)}
                            className="flex items-center gap-1.5 text-xs text-violet-300 hover:text-white transition-colors"
                          >
                            {copiedSnippet === section.codeSnippet.code ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 text-xs font-mono text-violet-200 overflow-x-auto leading-relaxed">
                          <code>{section.codeSnippet.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-white/10 bg-slate-900/90 backdrop-blur flex items-center justify-between shrink-0">
                <p className="text-xs text-gray-400 hidden sm:block">
                  Need custom automation? SecureLens REST APIs support programmatic webhooks.
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Link
                    href="/dashboard/live-scan"
                    onClick={() => setSelectedTopic(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-600/25"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Launch Scan Now
                  </Link>
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
