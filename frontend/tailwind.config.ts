import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Layout Theme mappings
        'sys-sidebar': 'var(--sidebar-bg)',
        'sys-sidebar-text': 'var(--sidebar-text)',
        'sys-sidebar-active': 'var(--sidebar-active-bg)',
        'sys-sidebar-border': 'var(--sidebar-border)',
        'sys-header': 'var(--header-bg)',
        'sys-header-text': 'var(--header-text)',
        'sys-panel': 'var(--panel-bg)',
        'sys-panel-text': 'var(--panel-text)',
        'sys-border': 'var(--border-light)',
        'sys-card': 'var(--card-bg)',
        'sys-card-text': 'var(--card-text)',
      },
    },
  },
  plugins: [],
};
export default config;
