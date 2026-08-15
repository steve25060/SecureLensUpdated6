"use client";

import { useState } from "react";
import { Menu, X, ArrowRight, Shield } from "lucide-react";
import Link from "next/link";
import { navigation } from "@/data/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 border border-white/10 backdrop-blur-md transition-all"
        aria-label="Toggle navigation menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute left-0 right-0 top-20 border-b border-white/10 bg-[#060814]/95 backdrop-blur-2xl lg:hidden z-50 shadow-2xl"
          >
            <div className="flex flex-col p-6 space-y-4">
              <div className="flex flex-col space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="py-3 px-4 rounded-lg text-base font-medium text-slate-300 hover:text-white hover:bg-violet-500/10 transition-all flex items-center justify-between"
                    onClick={() => setOpen(false)}
                  >
                    <span>{item.title}</span>
                    <ArrowRight className="h-4 w-4 opacity-40" />
                  </Link>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                <Link href="/login" onClick={() => setOpen(false)}>
                  <button className="w-full py-3 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition-all">
                    Log In
                  </button>
                </Link>
                <Link href="/register" onClick={() => setOpen(false)}>
                  <button className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
