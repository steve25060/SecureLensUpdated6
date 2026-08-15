'use client';

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DemoGallery from "@/components/sections/DemoGallery/DemoGallery";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export default function DemoGalleryPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-medium uppercase tracking-wider text-violet-300 shadow-lg shadow-violet-950/20">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Product Walkthrough & Demo Gallery
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Explore <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">SecureLens</span> in Action
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Step through our complete product tour showcasing multi-engine threat analysis, real-time live scanning, findings correlation, and AI-driven remediation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setIsOpen(true)}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-semibold text-white shadow-xl shadow-violet-900/40 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" />
              Open Interactive Gallery
            </button>
            <Link href="/register">
              <button className="px-6 py-3.5 rounded-xl border border-white/10 bg-white/5 font-semibold text-white hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
      <Footer />
      <DemoGallery isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
