'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield, Scale, FileText, Lock, AlertTriangle, CheckCircle2,
  ArrowLeft, ExternalLink, Globe, Terminal, Cpu, Mail, Download,
  Search, ChevronRight, Check, Sparkles, BookOpen, AlertOctagon, HelpCircle
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms & Service Scope',
    icon: Scale,
    content: (
      <div className="space-y-4">
        <p>
          Welcome to <strong>SecureLens</strong> (&ldquo;SecureLens Platform Inc.&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). By accessing, registering for, or using our automated application security posture management platform, cloud scanning engines, AI Copilot, or associated REST APIs (collectively, the &ldquo;Service&rdquo;), you (&ldquo;User&rdquo;, &ldquo;Organization&rdquo;, or &ldquo;Customer&rdquo;) agree to be legally bound by these Terms and Conditions (&ldquo;Terms&rdquo;).
        </p>
        <p>
          If you are accepting on behalf of an enterprise entity, corporation, or government organization, you represent and warrant that you possess the legal authority to bind that entity to these Terms. If you do not agree to all terms and conditions set forth herein, you must immediately discontinue use of the platform.
        </p>
      </div>
    ),
  },
  {
    id: 'authorization',
    title: '2. Mandatory Authorization & Permitted Scanning Policy',
    icon: AlertOctagon,
    badge: 'Critical Legal Clause',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
    content: (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs leading-relaxed flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block mb-1">Strict Prohibition Against Unauthorized Security Audits:</strong>
            You expressly agree to ONLY target web domains, network infrastructure, IP addresses, APIs, and GitHub repositories that you own, operate, or for which you have obtained express, unambiguous, written authorization to perform dynamic (DAST) or static (SAST) security evaluations.
          </div>
        </div>
        <p>Under these Terms, you agree that you shall NOT:</p>
        <ul className="list-disc pl-5 space-y-2 text-xs text-gray-300">
          <li>Initiate denial-of-service (DoS/DDoS) floods, stress attacks, or resource exhaustion vectors against non-consenting target hosts.</li>
          <li>Utilize SecureLens engines (such as Nuclei, Katana, TestSSL, GitLeaks, or WAF probes) against government, critical infrastructure, financial institutions, or third-party web properties without formal contractual permission.</li>
          <li>Attempt to weaponize, exploit, or distribute discovered zero-day vulnerabilities or extracted credentials obtained via the Service for malicious intent.</li>
          <li>Circumvent rate limits, IP restrictions, or scanning profiles configured on the platform.</li>
        </ul>
        <p className="text-xs text-gray-400">
          SecureLens reserves the right to immediately freeze, terminate accounts, and cooperate with international law enforcement agencies upon detection of unlawful scanning activities.
        </p>
      </div>
    ),
  },
  {
    id: 'services',
    title: '3. Description of Scanning Engines & Platform Features',
    icon: Terminal,
    content: (
      <div className="space-y-4">
        <p>
          SecureLens provides an integrated suite of automated DevSecOps intelligence tools, including but not limited to:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
            <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
              <Globe size={13} /> Dynamic Web & API Scans (DAST)
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Automated DNS resolution, SSL/TLS cipher validation, Katana web crawling, WAF fingerprinting, OWASP Top 10 fuzzing, and Nuclei security template execution.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
            <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
              <Lock size={13} /> Source Code & Secret Audits (SAST)
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              GitLeaks & TruffleHog regex token detection, Semgrep AST semantic code analysis, Dockerfile misconfiguration checks, and Software Bill of Materials (SBOM) dependency audits.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
            <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
              <Sparkles size={13} /> AI Copilot & Automated Remediation
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Automated patch suggestions, CVSS score explanation, attack narrative modeling, and intelligent failover across Gemini, Groq, OpenRouter, OpenAI, and Ollama engines.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
            <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
              <FileText size={13} /> Enterprise Reports & Compliance
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Instant PDF/JSON/CSV export generation, OWASP/SOC2 compliance matrices, and third-party alert webhooks (Slack, Jira, GitHub, Discord, PagerDuty).
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ai-copilot',
    title: '4. AI Copilot, Code Generation & BYOK Policy',
    icon: Cpu,
    content: (
      <div className="space-y-4">
        <p>
          The SecureLens AI Copilot generates remediation advice, code patches, and attack scenario analyses to assist security engineers. You acknowledge and agree that:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs text-gray-300">
          <li>
            <strong>Human Review Required:</strong> AI-generated code fixes, configuration snippets, and security recommendations are provided &ldquo;as is&rdquo; for advisory purposes. You are solely responsible for reviewing, testing, and validating all suggested code before applying them to production systems.
          </li>
          <li>
            <strong>Bring-Your-Own-Key (BYOK):</strong> When using third-party AI providers (Google AI Studio, Groq, OpenRouter, OpenAI, Anthropic), you are bound by their respective Terms of Service and data retention policies. SecureLens stores your encrypted API keys locally or in isolated runtime memory.
          </li>
          <li>
            <strong>Zero AI Model Training on Client Code:</strong> SecureLens does not use your proprietary source code, vulnerability findings, or custom scan logs to train publicly accessible machine learning models.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'account',
    title: '5. Account Security, Credentials & API Tokens',
    icon: Lock,
    content: (
      <div className="space-y-4">
        <p>
          When you register for SecureLens, you agree to maintain accurate, current, and complete information. You are strictly responsible for safeguarding your login password, Two-Factor Authentication (TOTP) recovery keys, and SecureLens API tokens (<code>sl_live_...</code>).
        </p>
        <p className="text-xs text-gray-300">
          You agree to notify SecureLens immediately at <a href="mailto:security@securelens.io" className="text-violet-400 underline">security@securelens.io</a> upon suspecting any unauthorized access, token compromise, or security breach involving your workspace. SecureLens is not liable for any losses caused by compromised user credentials.
        </p>
      </div>
    ),
  },
  {
    id: 'intellectual-property',
    title: '6. Intellectual Property & Customer Data Ownership',
    icon: BookOpen,
    content: (
      <div className="space-y-4">
        <p>
          <strong>Your Intellectual Property:</strong> You retain 100% ownership of all source code, repository files, target architectures, scan reports, and finding telemetry processed through your SecureLens workspaces. SecureLens claims no ownership over your intellectual property.
        </p>
        <p>
          <strong>SecureLens Platform Rights:</strong> SecureLens Platform Inc. retains all right, title, and interest in and to the platform, UI design, orchestrator algorithms, vulnerability rule packs, branding, and documentation.
        </p>
      </div>
    ),
  },
  {
    id: 'disclaimer',
    title: '7. Warranty Disclaimer & Scanner Limitations',
    icon: AlertTriangle,
    badge: 'Legal Disclaimer',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    content: (
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
          THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND.
        </p>
        <p className="text-xs text-gray-300 leading-relaxed">
          While SecureLens incorporates industry-standard security engines and advanced heuristics, no automated security scanner or static analyzer can guarantee the detection of 100% of all vulnerabilities, zero-day exploits, logic bugs, or architectural flaws. SecureLens expressly disclaims any warranty that the Service will be completely uninterrupted, error-free, or entirely invulnerable to false positives/negatives.
        </p>
      </div>
    ),
  },
  {
    id: 'liability',
    title: '8. Limitation of Liability',
    icon: Scale,
    content: (
      <div className="space-y-4">
        <p className="text-xs text-gray-300 leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SECURELENS PLATFORM INC., ITS DIRECTORS, EMPLOYEES, AFFILIATES, OR PARTNERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA LOSS, SYSTEM DOWNTIME, THIRD-PARTY CLOUD PROVIDER PENALTIES, OR SECURITY BREACH LOSSES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
        </p>
      </div>
    ),
  },
  {
    id: 'governing-law',
    title: '9. Governing Law & Dispute Resolution',
    icon: Globe,
    content: (
      <div className="space-y-4">
        <p className="text-xs text-gray-300">
          These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law principles. Any dispute arising out of or relating to these Terms shall be resolved through binding confidential arbitration conducted in accordance with commercial arbitration rules.
        </p>
      </div>
    ),
  },
  {
    id: 'contact',
    title: '10. Contact & Legal Notices',
    icon: Mail,
    content: (
      <div className="space-y-3">
        <p className="text-xs text-gray-300">
          If you have questions, regulatory inquiries, or legal concerns regarding these Terms and Conditions, please reach out to our legal and security compliance team:
        </p>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono space-y-1.5 text-gray-300">
          <div>SecureLens Platform Inc. • Legal & Compliance Division</div>
          <div>Email: <a href="mailto:legal@securelens.io" className="text-violet-400 hover:underline">legal@securelens.io</a></div>
          <div>Security Incident Response: <a href="mailto:security@securelens.io" className="text-violet-400 hover:underline">security@securelens.io</a></div>
          <div>Headquarters: 500 Cyber Parkway, Suite 400, San Francisco, CA 94105</div>
        </div>
      </div>
    ),
  },
];

export default function TermsAndConditionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('acceptance');

  const filteredSections = SECTIONS.filter(
    s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-violet-600 selection:text-white pb-20">
      {/* Background Cyber Ambient Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-violet-600/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[350px] bg-fuchsia-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Register
            </Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <Shield size={16} className="text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">SecureLens</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 font-mono hidden md:inline">
              Effective Date: January 1, 2026 • v2.4 Enterprise
            </span>
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-xs font-bold text-white shadow-md shadow-violet-600/20 transition-all cursor-pointer"
            >
              Console Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/15 border border-violet-500/30 text-violet-300 text-xs font-semibold">
            <Scale size={13} /> Legal Agreement & Terms of Service
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            SecureLens Terms & Conditions
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
            Please read these terms carefully before utilizing our dynamic vulnerability scanner, static source code engine, AI Copilot, or enterprise security telemetry APIs.
          </p>
        </motion.div>

        {/* Quick Search & Summary Box */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search clauses (e.g. 'authorization', 'AI code', 'scanning liability')..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-end gap-2">
            <button
              onClick={() => window.print()}
              className="w-full md:w-auto px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download size={14} /> Save / Print Legal PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout (Table of Contents Sidebar + Document Body) */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Table of Contents Sticky Sidebar */}
          <div className="lg:col-span-4 sticky top-24 space-y-3">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-violet-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Table of Contents</h3>
              </div>

              <div className="space-y-1">
                {SECTIONS.map((sec, idx) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={() => setActiveSection(sec.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                        isActive
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30 font-bold'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
                      }`}
                    >
                      <Icon size={13} className={isActive ? 'text-violet-400' : 'text-gray-500'} />
                      <span className="truncate">{sec.title}</span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Quick Support Badge */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-600/10 to-transparent border border-violet-500/20 space-y-2">
              <div className="flex items-center gap-2 text-violet-300 text-xs font-bold">
                <HelpCircle size={14} /> Questions regarding compliance?
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Contact our data protection and compliance officers directly at{' '}
                <a href="mailto:legal@securelens.io" className="text-violet-400 hover:underline font-mono">
                  legal@securelens.io
                </a>
              </p>
            </div>
          </div>

          {/* Clauses & Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {filteredSections.map((sec, index) => {
              const Icon = sec.icon;
              return (
                <motion.div
                  key={sec.id}
                  id={sec.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.3 }}
                  className="p-6 sm:p-7 rounded-3xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all space-y-4 scroll-mt-24"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                        <Icon size={16} />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {sec.title}
                      </h2>
                    </div>

                    {sec.badge && (
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase ${sec.badgeColor || 'bg-violet-500/10 text-violet-400 border-violet-500/20'}`}>
                        {sec.badge}
                      </span>
                    )}
                  </div>

                  <div className="text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/[0.04] pt-4">
                    {sec.content}
                  </div>
                </motion.div>
              );
            })}

            {/* Bottom Register Confirmation Action Card */}
            <div className="p-7 rounded-3xl bg-gradient-to-br from-violet-600/15 via-purple-600/10 to-transparent border border-violet-500/30 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white">Ready to proceed with account creation?</h3>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    By checking the agreement box on the registration screen and completing sign-up, you acknowledge that you have read, understood, and consented to these Terms & Conditions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Return to Register Form
                </Link>
                <Link
                  href="/privacy"
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 transition-all cursor-pointer"
                >
                  Read Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
