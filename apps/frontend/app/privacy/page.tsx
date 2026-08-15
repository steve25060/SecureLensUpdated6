'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield, Lock, Eye, FileText, ArrowLeft, Globe, CheckCircle2,
  Database, Server, Cpu, Mail, Download, Check
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-violet-600 selection:text-white pb-20">
      {/* Background Cyber Ambient Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-violet-600/10 blur-[130px] rounded-full" />
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
            <Link
              href="/terms"
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 transition-all cursor-pointer"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/15 border border-violet-500/30 text-violet-300 text-xs font-semibold">
            <Lock size={13} /> Privacy & Data Protection Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            SecureLens Privacy Policy
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Last Updated: January 1, 2026 • SecureLens Platform Inc.
          </p>
        </motion.div>

        {/* Key Commitments Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
            <div className="flex items-center gap-2 text-violet-400 text-xs font-bold">
              <Cpu size={14} /> Zero AI Training
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              We never use your source code, scan results, or AST tokens to train public AI models.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
            <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
              <Database size={14} /> Ephemeral Processing
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Uploaded files and source code artifacts are audited in sandbox containers and wiped post-scan.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
              <Shield size={14} /> End-to-End Encryption
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              All stored telemetry, findings, and credentials are encrypted via AES-256 at rest and TLS 1.3 in transit.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6 text-xs sm:text-sm text-gray-300 leading-relaxed">
          <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <h2 className="text-base font-bold text-white">1. Information We Collect</h2>
            <p>
              When you use SecureLens, we collect only the information strictly necessary to provide vulnerability assessment services:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-300">
              <li><strong>Account Data:</strong> Name, work email address, organization name, job title, and password hashes (bcrypt/argon2).</li>
              <li><strong>Scan Telemetry:</strong> Target hostnames, URLs, repository URLs, discovered vulnerability metadata (CWE, CVSS, remediation advisories), and execution logs.</li>
              <li><strong>Integration Credentials:</strong> User-supplied API keys (Google Gemini, OpenAI, Groq, OpenRouter) and webhook URLs (Slack, Jira, Discord), stored in isolated local client storage or securely encrypted environment variables.</li>
            </ul>
          </section>

          <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <h2 className="text-base font-bold text-white">2. How We Use and Protect Your Data</h2>
            <p>
              Your vulnerability reports and source code findings are strictly private to your authenticated workspace. SecureLens does NOT sell, rent, monetize, or share your proprietary scan results or vulnerability intelligence with any third party, marketing broker, or public repository.
            </p>
          </section>

          <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <h2 className="text-base font-bold text-white">3. Data Retention & Erasure</h2>
            <p>
              You retain full control over your telemetry. You may delete individual findings, purge past scan runs, or completely delete your workspace at any time directly from the SecureLens Dashboard or REST API. Upon workspace deletion, all associated findings, logs, and report snapshots are permanently purged from active databases.
            </p>
          </section>

          <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <h2 className="text-base font-bold text-white">4. Contact Data Protection Officer</h2>
            <p>
              For GDPR/CCPA data export requests, deletion verification, or privacy questions:
            </p>
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] font-mono text-xs text-violet-300">
              Email: <a href="mailto:privacy@securelens.io" className="underline">privacy@securelens.io</a> • Data Protection Officer, SecureLens Platform Inc.
            </div>
          </section>
        </div>

        {/* Back Link */}
        <div className="pt-4 flex items-center justify-between">
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Register
          </Link>
          <Link
            href="/terms"
            className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
          >
            View Terms & Conditions →
          </Link>
        </div>
      </div>
    </div>
  );
}
