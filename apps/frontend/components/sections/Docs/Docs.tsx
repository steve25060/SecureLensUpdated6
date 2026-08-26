'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ExternalLink, X, Copy, Check, ChevronRight,
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
    overview: 'SecureLens combines open-source intelligence (OSINT), active dynamic testing (DAST), static application security testing (SAST), and secrets detection into a single automated pipeline.',
    sections: [
      {
        heading: '1. Create or Select a Workspace',
        content: 'Workspaces group your web domains, API endpoints, and GitHub repositories into isolated security perimeters with dedicated risk scoring and history tracking.',
        keyPoints: [
          'Navigate to Dashboard → Workspaces to add a new production or staging target.',
          'Specify your Website URL (e.g., https://example.com) or GitHub Repo URL.',
          'Workspaces automatically synchronize across Live Scan and Copilot.'
        ]
      },
      {
        heading: '2. Launch a Live Security Scan',
        content: 'Select your target workspace and choose from 3 scanning modes: Website Analysis, GitHub Source Scan, or Full Combined Audit.',
        codeSnippet: {
          language: 'bash',
          code: `# Launch a live automated scan via cURL API\ncurl -X POST https://securelens-backend-o213.onrender.com/api/scans \\\n  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "targetUrl": "https://uptoskills.com",\n    "mode": "WEBSITE",\n    "profile": "deep_cloud_api",\n    "engines": ["ZAP", "NUCLEI", "NIKTO", "WAPITI"]\n  }'`
        }
      },
      {
        heading: '3. Real-Time Telemetry & AI Correlation',
        content: 'Watch live terminal outputs as engines execute in parallel. Once completed, SecureLens correlates findings, calculates an updated risk score (0-100), and generates AI fix suggestions.'
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
    overview: 'SecureLens utilizes industry-standard YAML templates compatible with Nuclei, Semgrep, and custom heuristic analyzers for automated signature matching.',
    sections: [
      {
        heading: 'Authoring a Custom Nuclei Template',
        content: 'Define custom protocols, matchers, and severity levels to detect proprietary endpoints, exposed secrets, or compliance violations.',
        codeSnippet: {
          language: 'yaml',
          code: `id: custom-auth-bypass-check\ninfo:\n  name: JWT Missing Signature & None Algorithm\n  author: securelens-security\n  severity: high\n  description: Detects API endpoints accepting unsigned JWT tokens\n  tags: jwt, auth, cve, custom\n\nhttp:\n  - method: GET\n    path:\n      - "{{BaseURL}}/api/v1/auth/verify"\n    headers:\n      Authorization: "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9."\n    matchers-condition: and\n    matchers:\n      - type: status\n        status:\n          - 200\n      - type: word\n        words:\n          - '"status":"authenticated"'`
        }
      },
      {
        heading: 'Pre-built Profile Presets',
        content: 'Choose from calibrated scanning profiles tailored for specific environments:',
        keyPoints: [
          '⚡ Fast Recon: Quick HTTP headers, SSL/TLS ciphers, DNS enumeration, and open ports (30s).',
          '🛡️ OWASP Top 10: In-depth SQLi, XSS, SSRF, CSRF, and broken access control probing (2-3 min).',
          '☁️ Deep Cloud & API: Full container, S3 bucket leak, GraphQL introspection, and JWT audits (4-5 min).'
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
    overview: 'SecureLens provides a modern RESTful API protected by JWT Bearer tokens and API keys. All responses return JSON structured under standardized schemas.',
    sections: [
      {
        heading: 'Authentication & Headers',
        content: 'Include your JWT or API key in the Authorization header of every request:',
        codeSnippet: {
          language: 'http',
          code: `GET /api/scans HTTP/1.1\nHost: securelens-backend-o213.onrender.com\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\nContent-Type: application/json`
        }
      },
      {
        heading: 'Core API Endpoints',
        content: 'Key endpoints for orchestrating scans and querying vulnerabilities:',
        keyPoints: [
          'POST /api/scans — Initiate an automated scan session (async).',
          'GET /api/scans/:id/status — Stream live progress percentage, engine states, and active phase.',
          'GET /api/scans/:id/logs — Fetch real-time streaming engine terminal logs.',
          'GET /api/findings — Query normalized vulnerability findings with severity filters.',
          'POST /api/ai-copilot/analyze — Generate AI remediation diffs and security patch code.'
        ],
        codeSnippet: {
          language: 'json',
          code: `{\n  "id": "scan_4f92c10a",\n  "status": "completed",\n  "score": 88,\n  "target": "https://uptoskills.com",\n  "mode": "WEBSITE",\n  "findingsCount": 4,\n  "enginesExecuted": ["ZAP", "NUCLEI", "NIKTO"],\n  "durationMs": 42100\n}`
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
        heading: '1. Shift Left with Pre-commit & CI/CD Checks',
        content: 'Catch secret leaks and vulnerable dependencies before code is merged into production branches.',
        keyPoints: [
          'Run Gitleaks and Semgrep rules on every pull request.',
          'Block merges if Critical CVEs or hardcoded credentials are detected.',
          'Set automated weekly baseline scans for all deployed staging and production endpoints.'
        ]
      },
      {
        heading: '2. Remediation SLAs by Severity',
        content: 'Establish clear internal SLAs for vulnerability resolution:',
        keyPoints: [
          '🔴 Critical (Score 9.0-10.0): Remediate or mitigate within 24 hours.',
          '🟠 High (Score 7.0-8.9): Remediate within 7 calendar days.',
          '🟡 Medium (Score 4.0-6.9): Address within standard 2-week sprint cycle.',
          '🔵 Low / Info: Review during regular maintenance windows.'
        ]
      },
      {
        heading: '3. Safe Scanning of Production Assets',
        content: 'When scanning live production surfaces, use Fast Recon or OWASP Top 10 profiles to minimize server load and prevent denial-of-service or database write side-effects.'
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
        heading: 'GitHub Actions Workflow',
        content: 'Add automated security gating to your repository with a single workflow file:',
        codeSnippet: {
          language: 'yaml',
          code: `name: SecureLens Security Gate\non:\n  push:\n    branches: [ main ]\n  pull_request:\n    branches: [ main ]\n\njobs:\n  security-scan:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout Code\n        uses: actions/checkout@v4\n\n      - name: Run SecureLens Scan\n        run: |\n          RESPONSE=$(curl -s -X POST https://securelens-backend-o213.onrender.com/api/scans \\\n            -H "Authorization: Bearer \${{ secrets.SECURELENS_API_KEY }}" \\\n            -H "Content-Type: application/json" \\\n            -d "{\\"repoUrl\\": \\"\${{ github.server_url }}/\${{ github.repository }}\\", \\"mode\\": \\"GITHUB\\"}")\n          echo "Scan initiated: $RESPONSE"`
        }
      },
      {
        heading: 'Supported Third-Party Ecosystem',
        content: 'SecureLens natively connects with:',
        keyPoints: [
          '🔔 Slack / Discord: Real-time webhook notifications for Critical & High security alerts.',
          '📋 Jira & Linear: One-click export of findings into trackable engineering bug tickets.',
          '🐳 Docker & Kubernetes: Container image scanning via integrated Trivy engine.'
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
    overview: 'Quick answers and remediation steps for network, authentication, and engine execution questions.',
    sections: [
      {
        heading: 'Render Cloud Free-Tier Hibernation (502 / 503)',
        content: 'Free cloud containers go into sleep mode after 15 minutes of inactivity. When a request is received, Render initiates a container cold start which takes 30-50 seconds.',
        keyPoints: [
          'Wait 30-45 seconds on initial load while the backend container wakes up.',
          'SecureLens includes an automatic retry client and offline fallback mode so the UI remains interactive.',
          'Once awake, subsequent scans and API requests respond in sub-seconds.'
        ]
      },
      {
        heading: 'OAuth Redirect / Callback Troubleshooting',
        content: 'If Google or GitHub login returns an error, verify that the Authorized Redirect URI in your developer console matches your deployment URL:',
        codeSnippet: {
          language: 'text',
          code: `Authorized Redirect URIs:\nhttps://securelens-backend-o213.onrender.com/api/auth/google/callback\nhttps://securelens-backend-o213.onrender.com/api/auth/github/callback\nhttps://securelens-frontend.onrender.com/callback`
        }
      },
      {
        heading: 'Large Repository Scan Timeouts',
        content: 'If a repository contains over 50,000 files, static analysis may exceed execution limits. Exclude large binary folders or vendor directories (.git, node_modules, dist, vendor) in your scan configuration.'
      }
    ]
  }
];

export default function Docs() {
  const [selectedTopic, setSelectedTopic] = useState<DocTopic | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(code);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const filteredDocs = DOC_TOPICS.filter(
    doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.overview.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2.5 rounded-xl bg-violet-600/10 border border-violet-500/30 text-violet-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              <ShiningText>Documentation</ShiningText>
            </h2>
          </div>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto font-normal">
            Everything you need to master SecureLens, automate security scanning, and remediate vulnerabilities at speed.
          </p>

          {/* Quick Search Bar */}
          <div className="mt-8 max-w-md mx-auto relative">
            <input
              type="text"
              placeholder="Search guides, templates, API endpoints..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b1020]/90 border border-white/15 focus:border-violet-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-400 outline-none backdrop-blur shadow-lg shadow-black/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Docs Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
        >
          {filteredDocs.map((doc, index) => (
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

        {/* Global CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <button
            onClick={() => setSelectedTopic(DOC_TOPICS[0])}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <BookOpen className="w-5 h-5" />
            Open Full Documentation Hub
          </button>
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
