"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Code2, Globe2, ShieldCheck } from "lucide-react";
import { Github } from "@/components/common/GithubIcon";

import HeroButtons from "./HeroButtons";
import HeroBackground from "./HeroBackground";
import { DashboardPreview } from "../DashboardPreview";
import DashboardWindow from "../DashboardPreview/DashboardWindow";

const scanTypes = [
  {
    title: "Website Analysis",
    description: "Scan websites and APIs",
    icon: Globe2,
    className: "from-violet-600 to-indigo-600",
  },
  {
    title: "GitHub Analysis",
    description: "Scan repositories and code",
    icon: Github,
    className: "from-sky-600 to-blue-600",
  },
  {
    title: "Combined Analysis",
    description: "Web + Code in one scan",
    icon: Code2,
    className: "from-emerald-600 to-green-600",
  },
];

const headlineMessages = [
  [
    "Unify Scans.",
    "Correlate Findings.",
    "Prioritize Risks.",
    "Remediate Faster.",
  ],
  [
    "Detect Threats.",
    "Map Exposure.",
    "Guide Fixes.",
    "Ship Secure.",
  ],
];

const cardContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.35,
    },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function Hero() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [displayedHeadline, setDisplayedHeadline] = useState(headlineMessages[0].join("\n"));
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullHeadline = headlineMessages[messageIndex].join("\n");

    const timeout = window.setTimeout(
      () => {
        if (!isDeleting && displayedHeadline.length < fullHeadline.length) {
          setDisplayedHeadline(fullHeadline.slice(0, displayedHeadline.length + 1));
          return;
        }

        if (!isDeleting && displayedHeadline.length === fullHeadline.length) {
          setIsDeleting(true);
          return;
        }

        if (isDeleting && displayedHeadline.length > 0) {
          setDisplayedHeadline(displayedHeadline.slice(0, -1));
          return;
        }

        setIsDeleting(false);
        setMessageIndex((current) => (current + 1) % headlineMessages.length);
      },
      !isDeleting && displayedHeadline.length === fullHeadline.length
        ? messageIndex === 0
        ? 3200
        : 1600
        : isDeleting && displayedHeadline.length === 0
        ? 350
        : isDeleting
        ? 22
        : 42
    );

    return () => window.clearTimeout(timeout);
  }, [displayedHeadline, isDeleting, messageIndex]);

  const headlineLines = displayedHeadline.split("\n");
  const cursorLine = Math.min(headlineLines.length - 1, headlineMessages[0].length - 1);
  const visibleLines = Array.from({ length: headlineMessages[0].length }, (_, index) => headlineLines[index] ?? "");

  return (
    <section className="relative overflow-x-hidden">
      <HeroBackground />

      {/* Updated hero container for wider layout, balanced columns, and centered content */}
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] items-center gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:grid-cols-[40%_60%] lg:py-16">
        <motion.div
          initial={{ opacity: 0, x: -40, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="mb-3 sm:mb-4 flex items-center gap-2"
          >
            <motion.span 
              className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-3xl sm:text-4xl lg:text-6xl font-black text-transparent leading-tight"
              style={{
                backgroundSize: '200% 100%',
              }}
            >
              SecureLens
            </motion.span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-violet-200 shadow-lg shadow-violet-950/20"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="truncate">AI-Powered Security Intelligence Platform</span>
          </motion.div>

            <h1 className="min-h-auto text-2xl sm:text-3xl lg:text-5xl font-black leading-tight sm:leading-snug text-white">
            {visibleLines.map((line, index) => {
              const isAccentLine = index >= 2;
              const content = line || "\u00a0";

              return (
                <span
                  key={index}
                  className={
                    isAccentLine
                      ? "block bg-linear-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent"
                      : "block"
                  }
                >
                  {content}
                  {index === cursorLine && (
                    <span className={isAccentLine ? "ml-1 animate-pulse text-fuchsia-300" : "ml-1 animate-pulse text-white"}>
                      |
                    </span>
                  )}
                </span>
              );
            })}
            </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
              className="mt-4 sm:mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-gray-300"
          >
            SecureLens orchestrates industry-leading open-source security tools,
            correlates findings into actionable insights, and helps developers
            fix vulnerabilities with AI.
          </motion.p>

          <HeroButtons />

          <motion.div
            variants={cardContainer}
            initial="hidden"
            animate="show"
            className="mt-9 grid gap-3 sm:grid-cols-3"
          >
            {scanTypes.map((item) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  variants={cardItem}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group rounded-xl border border-white/10 bg-[#0b1020]/75 p-4 shadow-2xl shadow-black/20 backdrop-blur transition-colors hover:border-violet-400/30 hover:bg-[#10172a]/85"
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br ${item.className} shadow-lg shadow-black/25 transition-transform group-hover:scale-110`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xs font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-[11px] leading-4 text-gray-400">{item.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { duration: 0.6 },
            x: { duration: 0.6 },
            scale: { duration: 0.6 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
          className="min-w-0 flex justify-end hidden lg:flex"
        >
          <DashboardWindow>
            <DashboardPreview />
          </DashboardWindow>
        </motion.div>
      </div>
    </section>
  );
}
