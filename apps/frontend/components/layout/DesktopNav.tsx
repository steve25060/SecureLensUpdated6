"use client";

import Link from "next/link";
import { navigation } from "@/data/navigation";
import { motion } from "framer-motion";

export default function DesktopNav() {
  return (
    <nav className="hidden items-center gap-1 xl:gap-2 lg:flex" aria-label="Main Navigation">
      {navigation.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className="relative px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-white group"
        >
          <span>{item.title}</span>
          <motion.span
            className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-violet-500 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            layoutId="nav-underline"
          />
        </Link>
      ))}
    </nav>
  );
}
