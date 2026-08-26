"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import Logo from "./Logo";
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";

import Button from "@/components/common/Button";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 border-b border-white/5 bg-[#02040d]/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <DesktopNav />

        <div className="hidden items-center gap-4 lg:flex">
          {/* Log In button redirects to the login page */}
          <Link href="/login">
            <Button variant="secondary" className="px-5 py-5 text-xs">
              Log In
            </Button>
          </Link>

          {/* Get Started Free redirects to the registration page */}
          <Link href="/register">
            <Button className="px-5 py-5 text-xs">
              Get Started Free
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <MobileNav />
      </div>
    </motion.header>
  );
}
