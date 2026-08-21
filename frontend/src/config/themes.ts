'use client';

export type ThemeMode = 'light' | 'dark';

export interface TintPreset {
  id: string;
  name: string;
  hex: string;
}

export const TINT_PRESETS: TintPreset[] = [
  { id: 'orange', name: 'Codexa Orange', hex: '#bf4507' },
  { id: 'blue', name: 'Codexa Blue', hex: '#1b2852' },
  { id: 'electric', name: 'Electric Blue', hex: '#070980' },
  { id: 'vivid', name: 'Vivid Orange', hex: '#c1521a' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'amber', name: 'Amber Gold', hex: '#f59e0b' },
  { id: 'crimson', name: 'Crimson', hex: '#ef4444' },
];

export const DEFAULT_TINT = '#bf4507';

export const getActiveMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const mode = localStorage.getItem('codexa_theme_mode');
  return mode === 'dark' ? 'dark' : 'light';
};

export const getActiveTint = (): string => {
  if (typeof window === 'undefined') return DEFAULT_TINT;
  return localStorage.getItem('codexa_tint_color') || DEFAULT_TINT;
};

// Convert Hex to HSL string for Tailwind --accent variable
export function hexToHsl(hex: string): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return '175 70% 35%';

  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const applyThemeMode = (mode: ThemeMode, tintHex: string = DEFAULT_TINT) => {
  if (typeof window === 'undefined') return;
  const html = document.documentElement;

  // Toggle dark class cleanly
  if (mode === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // Remove any legacy theme classes
  ['theme-rose-velvet', 'theme-solar-flare', 'theme-neon-meadow', 'theme-amber-glow'].forEach(c => html.classList.remove(c));

  // Set CSS accent variables
  const hsl = hexToHsl(tintHex);
  html.style.setProperty('--accent', hsl);
  html.style.setProperty('--tint-color', tintHex);

  localStorage.setItem('codexa_theme_mode', mode);
  localStorage.setItem('codexa_tint_color', tintHex);

  // Fire theme update event
  window.dispatchEvent(new Event('codexa_theme_change'));
};

// Legacy compatibility helper
export const themes = [
  { id: 'light', name: 'Light Mode', class: '' },
  { id: 'dark', name: 'Dark Mode', class: 'dark' }
];

export const getActiveTheme = (): string => getActiveMode();
export const applyTheme = (modeId: string) => applyThemeMode(modeId === 'dark' ? 'dark' : 'light', getActiveTint());
