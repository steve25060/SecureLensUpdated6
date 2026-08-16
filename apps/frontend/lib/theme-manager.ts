/**
 * SecureLens Enterprise Cyber Defense Theme Engine
 * Provides high-precision cybersecurity color palettes, background depths, and aura glow effects.
 */

export interface ThemePreset {
  id: string;
  name: string;
  codename: string;
  category: 'Intelligence' | 'SOC Defense' | 'Zero Trust' | 'Offensive' | 'Tactical' | 'Cloud';
  description: string;
  primary: string;
  primaryRgb: string;
  light: string;
  dark: string;
  glow: string;
  previewGradient: string;
  badge: string;
}

export interface BackgroundMode {
  id: string;
  name: string;
  description: string;
  bg: string;
  bgSecondary: string;
  surface: string;
  surfaceHover: string;
  border: string;
}

export interface GlowIntensity {
  id: 'tactical' | 'balanced' | 'hyper';
  name: string;
  description: string;
  opacity: number;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'cyberpunk-violet',
    name: 'Cyberpunk Violet',
    codename: 'NEURAL-AI',
    category: 'Intelligence',
    description: 'Neural intelligence & deep scanning aesthetic with high-contrast violet highlights.',
    primary: '#8b5cf6',
    primaryRgb: '139, 92, 246',
    light: '#a78bfa',
    dark: '#6d28d9',
    glow: 'rgba(139, 92, 246, 0.35)',
    previewGradient: 'from-violet-600 via-purple-600 to-indigo-600',
    badge: 'Default Flagship',
  },
  {
    id: 'matrix-cobalt',
    name: 'Cobalt Shield',
    codename: 'SOC-DEFENSE',
    category: 'SOC Defense',
    description: 'Defense-grade network monitoring, perimeter defense & banking security SOC.',
    primary: '#3b82f6',
    primaryRgb: '59, 130, 246',
    light: '#60a5fa',
    dark: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.35)',
    previewGradient: 'from-blue-600 via-sky-600 to-cyan-600',
    badge: 'Perimeter SOC',
  },
  {
    id: 'emerald-sentinel',
    name: 'Emerald Sentinel',
    codename: 'ZERO-TRUST',
    category: 'Zero Trust',
    description: 'Zero-trust architecture, compliance telemetry & automated clean audit assurance.',
    primary: '#10b981',
    primaryRgb: '16, 185, 129',
    light: '#34d399',
    dark: '#047857',
    glow: 'rgba(16, 185, 129, 0.35)',
    previewGradient: 'from-emerald-600 via-teal-600 to-green-600',
    badge: 'Zero Trust',
  },
  {
    id: 'crimson-breach',
    name: 'Crimson Breach',
    codename: 'RED-TEAM',
    category: 'Offensive',
    description: 'Red-teaming operations, zero-day research, exploit analysis & critical alerts.',
    primary: '#f43f5e',
    primaryRgb: '244, 63, 94',
    light: '#fb7185',
    dark: '#be123c',
    glow: 'rgba(244, 63, 94, 0.35)',
    previewGradient: 'from-rose-600 via-red-600 to-pink-600',
    badge: 'Red Team',
  },
  {
    id: 'quantum-cyan',
    name: 'Quantum Cyan',
    codename: 'CLOUD-MESH',
    category: 'Cloud',
    description: 'Cloud posture management, API gateway mesh & live packet flow telemetry.',
    primary: '#06b6d4',
    primaryRgb: '6, 182, 212',
    light: '#22d3ee',
    dark: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.35)',
    previewGradient: 'from-cyan-600 via-teal-500 to-blue-600',
    badge: 'Cloud Mesh',
  },
  {
    id: 'solar-amber',
    name: 'Solar Flare Amber',
    codename: 'THREAT-RADAR',
    category: 'Intelligence',
    description: 'Threat alert levels, vulnerability heatmaps & active CVE radar monitoring.',
    primary: '#f59e0b',
    primaryRgb: '245, 158, 11',
    light: '#fbbf24',
    dark: '#b45309',
    glow: 'rgba(245, 158, 11, 0.35)',
    previewGradient: 'from-amber-500 via-orange-500 to-yellow-500',
    badge: 'Threat Radar',
  },
  {
    id: 'phantom-stealth',
    name: 'Phantom Stealth',
    codename: 'TACTICAL-OPS',
    category: 'Tactical',
    description: 'Minimalist low-distraction dark mode for focused code auditing & night shifts.',
    primary: '#94a3b8',
    primaryRgb: '148, 163, 184',
    light: '#cbd5e1',
    dark: '#475569',
    glow: 'rgba(148, 163, 184, 0.25)',
    previewGradient: 'from-slate-600 via-gray-600 to-zinc-600',
    badge: 'Tactical Ops',
  },
  {
    id: 'aurora-lime',
    name: 'Aurora Toxic Lime',
    codename: 'BINARY-EXPLOIT',
    category: 'Offensive',
    description: 'Reverse engineering, binary analysis, kernel inspection & hacker terminal aesthetic.',
    primary: '#84cc16',
    primaryRgb: '132, 204, 22',
    light: '#a3e635',
    dark: '#4d7c0f',
    glow: 'rgba(132, 204, 22, 0.35)',
    previewGradient: 'from-lime-500 via-emerald-500 to-green-600',
    badge: 'Binary Recon',
  },
  {
    id: 'nebula-amethyst',
    name: 'Nebula Amethyst',
    codename: 'COPILOT-AI',
    category: 'Intelligence',
    description: 'Autonomous AI patch generation, executive CISO summaries & neural insights.',
    primary: '#d946ef',
    primaryRgb: '217, 70, 239',
    light: '#e879f9',
    dark: '#a21caf',
    glow: 'rgba(217, 70, 239, 0.35)',
    previewGradient: 'from-fuchsia-600 via-pink-600 to-purple-600',
    badge: 'AI Copilot',
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Void',
    codename: 'DEEP-RADAR',
    category: 'SOC Defense',
    description: 'Ultra-deep space indigo for dark room threat operations & OSINT tracking.',
    primary: '#6366f1',
    primaryRgb: '99, 102, 241',
    light: '#818cf8',
    dark: '#4338ca',
    glow: 'rgba(99, 102, 241, 0.35)',
    previewGradient: 'from-indigo-600 via-violet-700 to-blue-700',
    badge: 'Deep Space',
  },
];

export const BACKGROUND_MODES: BackgroundMode[] = [
  {
    id: 'onyx',
    name: 'Onyx Pure Black',
    description: 'True OLED deep black with maximum visual contrast and zero ambient light.',
    bg: '#050508',
    bgSecondary: '#090a10',
    surface: '#0d0e17',
    surfaceHover: '#131522',
    border: 'rgba(255, 255, 255, 0.05)',
  },
  {
    id: 'midnight',
    name: 'Cyber Midnight',
    description: 'Deep navy-tinted cyber defense background for extended analysis sessions.',
    bg: '#070b14',
    bgSecondary: '#0c1220',
    surface: '#11192c',
    surfaceHover: '#18233c',
    border: 'rgba(59, 130, 246, 0.12)',
  },
  {
    id: 'carbon',
    name: 'Obsidian Carbon',
    description: 'Refined neutral titanium dark interface with sleek matte borders.',
    bg: '#0b0d11',
    bgSecondary: '#11141a',
    surface: '#171b23',
    surfaceHover: '#1f242e',
    border: 'rgba(255, 255, 255, 0.07)',
  },
  {
    id: 'slate',
    name: 'Enterprise Slate',
    description: 'Industrial cybersecurity workstation with crisp slate boundary lines.',
    bg: '#0f172a',
    bgSecondary: '#1e293b',
    surface: '#243247',
    surfaceHover: '#2e3e57',
    border: 'rgba(255, 255, 255, 0.09)',
  },
];

export const GLOW_INTENSITIES: GlowIntensity[] = [
  {
    id: 'tactical',
    name: 'Tactical (Minimal)',
    description: 'Razor-sharp precision with subtle accent lines and zero distraction.',
    opacity: 0.15,
  },
  {
    id: 'balanced',
    name: 'Balanced (SOC Standard)',
    description: 'Smooth luminescent ambient lighting around active widgets and badges.',
    opacity: 0.35,
  },
  {
    id: 'hyper',
    name: 'Hyper Cyberpunk (Max Aura)',
    description: 'Vibrant neon glows, glowing borders, and high-impact visual energy.',
    opacity: 0.65,
  },
];

export interface ThemeConfig {
  presetId: string;
  backgroundModeId: string;
  glowIntensityId: 'tactical' | 'balanced' | 'hyper';
  compactMode: boolean;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  presetId: 'cyberpunk-violet',
  backgroundModeId: 'onyx',
  glowIntensityId: 'balanced',
  compactMode: false,
};

export const THEME_STORAGE_KEY = 'sl_theme_config';

export function getStoredThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME_CONFIG;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_THEME_CONFIG, ...JSON.parse(raw) };
    }
    // Backward compatibility with legacy sl_accent_color
    const legacyAccent = localStorage.getItem('sl_accent_color');
    if (legacyAccent) {
      let color = '#8b5cf6';
      try {
        const parsed = JSON.parse(legacyAccent);
        color = parsed.value || parsed;
      } catch {
        color = legacyAccent;
      }
      const match = THEME_PRESETS.find(p => p.primary === color || p.dark === color);
      if (match) {
        return { ...DEFAULT_THEME_CONFIG, presetId: match.id };
      }
    }
  } catch {}
  return DEFAULT_THEME_CONFIG;
}

export function applyThemeConfig(config: Partial<ThemeConfig>): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME_CONFIG;

  const current = getStoredThemeConfig();
  const merged: ThemeConfig = { ...current, ...config };

  const preset = THEME_PRESETS.find(p => p.id === merged.presetId) || THEME_PRESETS[0];
  const bgMode = BACKGROUND_MODES.find(b => b.id === merged.backgroundModeId) || BACKGROUND_MODES[0];
  const glow = GLOW_INTENSITIES.find(g => g.id === merged.glowIntensityId) || GLOW_INTENSITIES[1];

  const root = document.documentElement;

  // Apply Primary Accent Colors
  root.style.setProperty('--color-primary', preset.primary);
  root.style.setProperty('--color-primary-rgb', preset.primaryRgb);
  root.style.setProperty('--color-primary-light', preset.light);
  root.style.setProperty('--color-primary-dark', preset.dark);
  root.style.setProperty('--color-accent', preset.primary);
  root.style.setProperty('--color-accent-light', preset.light);
  root.style.setProperty('--color-accent-dark', preset.dark);
  root.style.setProperty('--color-accent-glow', `rgba(${preset.primaryRgb}, ${glow.opacity})`);

  // Violet token overrides (for legacy classes)
  root.style.setProperty('--color-violet-600', preset.primary);
  root.style.setProperty('--color-violet-500', preset.primary);
  root.style.setProperty('--color-violet-400', preset.light);
  root.style.setProperty('--color-violet-300', preset.light);
  root.style.setProperty('--color-violet-700', preset.dark);

  // Background Depths
  root.style.setProperty('--background', bgMode.bg);
  root.style.setProperty('--background-secondary', bgMode.bgSecondary);
  root.style.setProperty('--surface', bgMode.surface);
  root.style.setProperty('--surface-hover', bgMode.surfaceHover);
  root.style.setProperty('--border', bgMode.border);

  // Inject / update dynamic style tag to override all Tailwind utility classes globally
  const styleId = 'sl-dynamic-theme-style';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    :root {
      --color-primary: ${preset.primary} !important;
      --color-primary-rgb: ${preset.primaryRgb} !important;
      --color-primary-light: ${preset.light} !important;
      --color-primary-dark: ${preset.dark} !important;
      --color-accent: ${preset.primary} !important;
      --color-accent-light: ${preset.light} !important;
      --color-accent-dark: ${preset.dark} !important;
      --color-accent-glow: rgba(${preset.primaryRgb}, ${glow.opacity}) !important;
      --background: ${bgMode.bg} !important;
      --background-secondary: ${bgMode.bgSecondary} !important;
      --surface: ${bgMode.surface} !important;
      --surface-hover: ${bgMode.surfaceHover} !important;
      --border: ${bgMode.border} !important;
    }

    body, html {
      background-color: ${bgMode.bg} !important;
    }

    /* Global Dynamic Class Overrides */
    .bg-violet-600, .bg-violet-500 {
      background-color: ${preset.primary} !important;
    }
    .hover\\:bg-violet-500:hover, .hover\\:bg-violet-600:hover {
      background-color: ${preset.light} !important;
    }
    .text-violet-400, .text-violet-300 {
      color: ${preset.light} !important;
    }
    .text-violet-500, .text-violet-600 {
      color: ${preset.primary} !important;
    }
    .border-violet-500, .border-violet-600 {
      border-color: ${preset.primary} !important;
    }
    .border-violet-500\\/20, .border-violet-500\\/30, .border-violet-600\\/20, .border-violet-600\\/30 {
      border-color: rgba(${preset.primaryRgb}, 0.25) !important;
    }
    .bg-violet-500\\/10, .bg-violet-600\\/10, .bg-violet-500\\/20, .bg-violet-600\\/20 {
      background-color: rgba(${preset.primaryRgb}, 0.12) !important;
    }
    .shadow-violet-600\\/20, .shadow-violet-600\\/40, .shadow-violet-500\\/10, .shadow-violet-500\\/20 {
      box-shadow: 0 10px 25px -5px rgba(${preset.primaryRgb}, ${glow.opacity}) !important;
    }
    .from-violet-600, .from-violet-500 {
      --tw-gradient-from: ${preset.primary} var(--tw-gradient-from-position, ) !important;
      --tw-gradient-to: rgba(${preset.primaryRgb}, 0) var(--tw-gradient-to-position, ) !important;
      --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
    }
    .to-violet-700, .to-violet-600 {
      --tw-gradient-to: ${preset.dark} var(--tw-gradient-to-position, ) !important;
    }
    .via-violet-600\\/10 {
      --tw-gradient-stops: var(--tw-gradient-from), rgba(${preset.primaryRgb}, 0.1), var(--tw-gradient-to) !important;
    }
  `;

  // Save to localStorage
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(merged));
    localStorage.setItem('sl_accent_color', JSON.stringify({ value: preset.primary }));
  } catch {}

  return merged;
}
