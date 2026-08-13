import type { Config } from "tailwindcss";

/**
 * Semantic Tailwind theme mapped onto the Apple design tokens in globals.css.
 * Components reference roles (label, canvas, separator, blue) — never literal
 * hex — so light/dark/contrast adapt automatically.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        label: {
          DEFAULT: "var(--label)",
          secondary: "var(--label-secondary)",
          tertiary: "var(--label-tertiary)",
          quaternary: "var(--label-quaternary)",
        },
        canvas: "var(--bg)",
        surface: "var(--bg-secondary)",
        elevated: "var(--bg-elevated)",
        separator: "var(--separator)",
        "separator-strong": "var(--separator-strong)",
        fill: "var(--fill)",
        "fill-secondary": "var(--fill-secondary)",
        "fill-tertiary": "var(--fill-tertiary)",
        blue: { DEFAULT: "var(--blue)", ink: "var(--blue-ink)" },
        green: { DEFAULT: "var(--green)", ink: "var(--green-ink)" },
        amber: { DEFAULT: "var(--amber)", ink: "var(--amber-ink)" },
        red: { DEFAULT: "var(--red)", ink: "var(--red-ink)" },
        purple: "var(--purple)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [],
};

export default config;
