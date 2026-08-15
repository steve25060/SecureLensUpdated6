'use client';

import {
  Globe, GitFork, Radio, Cpu, ShieldCheck, Lock, Search, Network,
  Bug, Sparkles, FolderTree, Code, Key, Package, Box, Server, FileText,
  Shield, Mail,
  type LucideIcon,
} from 'lucide-react';

/**
 * Premium engine icon — gradient tile with the engine's glyph.
 * Used by Live Scan / GitHub Scan engine lists.
 */
const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  'git-fork': GitFork,
  radio: Radio,
  cpu: Cpu,
  'shield-check': ShieldCheck,
  lock: Lock,
  search: Search,
  network: Network,
  bug: Bug,
  sparkles: Sparkles,
  'folder-tree': FolderTree,
  code: Code,
  key: Key,
  package: Package,
  box: Box,
  server: Server,
  'file-text': FileText,
  shield: Shield,
  mail: Mail,
};

export function EngineIcon({
  name,
  accent,
  size = 16,
}: {
  name: string;
  /** Tailwind gradient classes from engines.ts, e.g. 'from-sky-500/20 to-blue-600/10 text-sky-300 border-sky-500/25' */
  accent: string;
  size?: number;
}) {
  const Icon = ICONS[name] ?? Sparkles;
  const tile = Math.round(size * 2.2);
  return (
    <div
      className={`shrink-0 rounded-xl bg-gradient-to-br ${accent} border backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/20`}
      style={{ width: tile, height: tile }}
    >
      <Icon size={size} strokeWidth={2} />
    </div>
  );
}
