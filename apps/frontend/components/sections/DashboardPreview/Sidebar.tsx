"use client";

import {
  LayoutDashboard,
  ShieldCheck,
  Globe,
  FileText,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";
import { Github } from "@/components/common/GithubIcon";

const menu = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    active: true,
  },
  {
    title: "Website Scan",
    icon: Globe,
  },
  {
    title: "GitHub Scan",
    icon: Github,
  },
  {
    title: "Findings",
    icon: ShieldCheck,
  },
  {
    title: "Reports",
    icon: FileText,
  },
  {
    title: "Analytics",
    icon: BarChart3,
  },
  {
    title: "AI Copilot",
    icon: Sparkles,
  },
  {
    title: "Settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-44 shrink-0 border-r border-white/5 bg-[#0A1020] md:block">
      <div className="border-b border-white/5 px-4 py-5">
        <h2 className="text-base font-bold text-white">
          SecureLens
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-violet-400">
          Security Workspace
        </p>
      </div>

      <nav className="space-y-1 p-3">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.title}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${
                item.active
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.title}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
