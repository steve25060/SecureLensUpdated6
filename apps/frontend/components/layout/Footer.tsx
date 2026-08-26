"use client";

import { motion } from "framer-motion";
import Logo from "./Logo";
import { Shield, CheckCircle2, ArrowRight, Globe, Share2 } from "lucide-react";
import { Github } from "@/components/common/GithubIcon";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative bg-[#02040b] text-slate-400 border-t border-white/5 pt-16 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow ambient light */}
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-violet-600/10 rounded-full blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 gap-10 lg:grid-cols-5 mb-16"
        >
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" className="inline-block">
              <Logo />
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              SecureLens orchestrates industry-leading open-source security engines, correlates findings into actionable intelligence, and remediates threats with AI.
            </p>
          </div>

          {/* Nav Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:col-span-3 gap-8">
            <div>
              <h3 className="text-xs font-bold text-white tracking-wider uppercase">Product</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#features" className="hover:text-violet-400 transition-colors">Features</a></li>
                <li><a href="#solutions" className="hover:text-violet-400 transition-colors">Solutions</a></li>
                <li><a href="#how-it-works" className="hover:text-violet-400 transition-colors">How it Works</a></li>
                <li><a href="#pricing" className="hover:text-violet-400 transition-colors">Pricing</a></li>
                <li><Link href="/demo-gallery" className="hover:text-violet-400 transition-colors">Demo Gallery</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-white tracking-wider uppercase">Company</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#about" className="hover:text-violet-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Press Kit</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-white tracking-wider uppercase">Resources</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#docs" className="hover:text-violet-400 transition-colors">Documentation</a></li>
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-violet-400 transition-colors">GitHub Repository</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Security Advisories</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-white tracking-wider uppercase">Legal & Trust</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link href="/privacy" className="hover:text-violet-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-violet-400 transition-colors">Terms of Service</Link></li>
                <li><Link href="/terms" className="hover:text-violet-400 transition-colors">Cookie Preferences</Link></li>
                <li><Link href="/terms" className="hover:text-violet-400 transition-colors">Security Trust Center</Link></li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 SecureLens Platform Inc. All rights reserved. Built for modern DevSecOps teams.</p>

          <div className="flex items-center space-x-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <span className="sr-only">GitHub</span>
              <Github className="h-4 w-4" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <span className="sr-only">Twitter</span>
              <Globe className="h-4 w-4" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <span className="sr-only">LinkedIn</span>
              <Share2 className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
