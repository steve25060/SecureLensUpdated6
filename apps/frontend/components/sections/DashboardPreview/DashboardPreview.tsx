"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  Bot,
  ChevronDown,
  Code2,
  FileText,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Plus,
  Settings,
  Shield,
  ShieldAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, active: true },
  { title: "Workspaces", icon: Code2 },
  { title: "Live Scan", icon: Activity },
  { title: "GitHub Scan", icon: GitBranch },
  { title: "Findings", icon: ShieldAlert },
  { title: "Reports", icon: FileText },
  { title: "AI Copilot", icon: Bot },
  { title: "Analytics", icon: Gauge },
  { title: "Settings", icon: Settings },
];

const scoreCards = [
  { title: "Overall Score", value: 84, label: "Great", color: "#22c55e" },
  { title: "Authentication", value: 42, label: "Poor", color: "#ef4444" },
  { title: "API Security", value: 91, label: "Excellent", color: "#22c55e" },
  { title: "Headers", value: 78, label: "Good", color: "#f59e0b" },
  { title: "Dependencies", value: 88, label: "Good", color: "#22c55e" },
  { title: "Secrets", value: 93, label: "Excellent", color: "#22c55e" },
];

const riskData = [
  { name: "Critical", value: 8, color: "#ef4444" },
  { name: "High", value: 12, color: "#f97316" },
  { name: "Medium", value: 17, color: "#eab308" },
  { name: "Low", value: 25, color: "#22c55e" },
];

const getDynamicDateLabel = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const findingData = [
  { date: getDynamicDateLabel(6), critical: 8, high: 18, medium: 31, low: 44 },
  { date: getDynamicDateLabel(5), critical: 10, high: 21, medium: 38, low: 49 },
  { date: getDynamicDateLabel(4), critical: 9, high: 25, medium: 42, low: 56 },
  { date: getDynamicDateLabel(3), critical: 12, high: 28, medium: 37, low: 51 },
  { date: getDynamicDateLabel(2), critical: 13, high: 32, medium: 45, low: 62 },
  { date: getDynamicDateLabel(1), critical: 17, high: 38, medium: 49, low: 70 },
  { date: getDynamicDateLabel(0), critical: 16, high: 41, medium: 55, low: 74 },
];

// Tuple type: [name, count, color]
const vulnerabilities: [string, number, string][] = [
  ["Missing Security Header", 12, "#ef4444"],
  ["Weak Cookie Settings", 8, "#f97316"],
  ["SQL Injection", 6, "#eab308"],
  ["Cross-Site Scripting", 5, "#22c55e"],
  ["Vulnerable Dependency", 4, "#3b82f6"],
];

const scans = [
  ["securelens", "Website", "Completed", "84/100", "51", "Just now"],
  ["vuln-web-app", "GitHub", "Completed", "67/100", "38", "2h ago"],
  ["shopify-clone", "Both", "Completed", "90/100", "23", "1d ago"],
  ["staging.site.com", "Website", "Completed", "72/100", "34", "2d ago"],
];

const activityItems = [
  ["Nuclei Scan Completed", "45 findings", "1m ago"],
  ["OWASP ZAP Completed", "12 alerts", "2h ago"],
  ["Nmap Scan Completed", "8 open ports", "3h ago"],
];

const panelMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const dashboardMotion = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.15,
    },
  },
};

function ScoreCard({ title, value, label, color }: (typeof scoreCards)[number]) {
  return (
    <motion.div
      variants={panelMotion}
      whileHover={{ y: -2, borderColor: "rgba(168,85,247,0.32)" }}
      className="rounded-lg border border-white/10 bg-[#0d1324]/95 p-3 shadow-md shadow-black/10"
    >
      <p className="text-[10px] leading-none text-gray-400">{title}</p>
      <div className="mt-2 flex items-center gap-2">
        <div
          className="grid h-12 w-12 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
          }}
        >
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0d1324]">
            <span className="text-base font-bold text-white">{value}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] text-gray-500">/100</p>
          <p className="truncate text-[9px] font-medium" style={{ color }}>
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, rotateX: 4 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-237.5 rounded-2xl border border-violet-400/15 bg-[#070b17]/95 p-1 shadow-[0_30px_100px_rgba(88,28,135,0.35)]"
    >
      <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-linear-to-r from-violet-500/20 via-transparent to-cyan-400/10 opacity-70 blur" />
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#090e1d]">
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-20 bg-linear-to-b from-violet-400/12 via-violet-400/4 to-transparent"
          animate={{ y: [-120, 500] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
        />

        <div className="grid h-177.5 grid-cols-[124px_minmax(0,1fr)]">
          <aside className="border-r border-white/5 bg-[#070c19] p-3">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-bold text-white">SecureLens</span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.title}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[10px] transition ${
                      item.active
                        ? "bg-violet-700 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </nav>


          </aside>

          <motion.main variants={dashboardMotion} initial="hidden" animate="show" className="min-w-0 p-3">
            <header className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">Dashboard</h2>
                <p className="mt-1 max-w-70 text-[10px] leading-4 text-gray-400">
                  Welcome back. Here is what is happening with your security posture.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-gray-300 sm:flex">
                  Last 7 days
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button className="flex items-center gap-1.5 rounded-md bg-violet-700 px-3 py-2 text-[10px] font-semibold text-white">
                  <Plus className="h-3 w-3" />
                  New Scan
                </button>
                <button className="rounded-md bg-white/5 p-2 text-gray-300">
                  <Bell className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>

            <motion.section variants={dashboardMotion} className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
              {scoreCards.map((card) => (
                <ScoreCard key={card.title} {...card} />
              ))}
            </motion.section>

            <section className="mb-3 grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)_0.95fr] gap-2.5">
              <motion.div variants={panelMotion} whileHover={{ y: -2 }} className="rounded-lg border border-white/10 bg-[#0d1324]/95 p-3 shadow-md shadow-black/10">
                <h3 className="mb-2 text-xs font-semibold text-white">Risk Overview</h3>
                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-2">
                  <ResponsiveContainer width="100%" height={92}>
                    <PieChart>
                      <Pie data={riskData} dataKey="value" innerRadius={24} outerRadius={38} paddingAngle={1}>
                        {riskData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-white">51</p>
                    <p className="text-[9px] text-gray-500">Total Findings</p>
                    {riskData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between gap-2 text-[9px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-gray-400">View all findings -&gt;</p>
              </motion.div>

              <motion.div variants={panelMotion} whileHover={{ y: -2 }} className="rounded-lg border border-white/10 bg-[#0d1324]/95 p-3 shadow-md shadow-black/10">
                <h3 className="mb-2 text-xs font-semibold text-white">Findings Over Time</h3>
                <ResponsiveContainer width="100%" height={105}>
                  <AreaChart data={findingData} margin={{ top: 5, right: 2, left: -28, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", fontSize: 10 }} />
                    <Area type="monotone" dataKey="low" stroke="#22c55e" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="medium" stroke="#eab308" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="high" stroke="#f97316" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="mt-1 text-[10px] text-gray-400">View full timeline -&gt;</p>
              </motion.div>

              <motion.div variants={panelMotion} whileHover={{ y: -2 }} className="rounded-lg border border-white/10 bg-[#0d1324]/95 p-3 shadow-md shadow-black/10">
                <h3 className="mb-2 text-xs font-semibold text-white">Top Vulnerability Types</h3>
                <div className="space-y-2">
                  {vulnerabilities.map(([name, count, color]) => (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[9px]">
                        <span className="min-w-0 truncate text-gray-400">{name}</span>
                        <span className="font-semibold text-white">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${count * 8}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-gray-400">View all analytics -&gt;</p>
              </motion.div>
            </section>

            <section className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] gap-2.5">
              <motion.div variants={panelMotion} whileHover={{ y: -2 }} className="rounded-lg border border-white/10 bg-[#0d1324]/95 p-3 shadow-md shadow-black/10">
                <h3 className="mb-2 text-xs font-semibold text-white">Recent Scans</h3>
                <div className="space-y-1.5">
                  {scans.map(([workspace, type, status, score, findings, date]) => (
                    <div
                      key={`${workspace}-${date}`}
                      className="grid grid-cols-[minmax(0,1fr)_56px_56px_42px_30px_42px] items-center gap-2 text-[9px] text-gray-400"
                    >
                      <span className="truncate text-gray-300">{workspace}</span>
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-center text-blue-300">{type}</span>
                      <span className={status === "Failed" ? "text-red-400" : "text-emerald-400"}>{status}</span>
                      <span>{score}</span>
                      <span>{findings}</span>
                      <span>{date}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={panelMotion} whileHover={{ y: -2 }} className="rounded-lg border border-white/10 bg-[#0d1324]/95 p-3 shadow-md shadow-black/10">
                <h3 className="mb-2 text-xs font-semibold text-white">Scan Activity</h3>
                <div className="space-y-2.5">
                  {activityItems.map(([title, detail, time]) => (
                    <div key={title} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[9px] text-gray-300">{title}</p>
                        <p className="text-[8px] text-gray-500">{detail}</p>
                      </div>
                      <span className="text-[8px] text-gray-500">{time}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-gray-400">View full activity -&gt;</p>
              </motion.div>
            </section>
          </motion.main>
        </div>
      </div>


    </motion.div>
  );
}
