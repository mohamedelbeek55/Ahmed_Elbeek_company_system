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
        primary: "#B51F2D",
        "on-primary": "#FFFFFF",
        charcoal: "#262626",
        "pale-red": "#F7E6E8",
        "light-gray": "#F5F5F5",
        outline: "#D9D9D9",
        success: "#1F7A4D",
        "on-success": "#FFFFFF",
        warning: "#C27803",
        "on-warning": "#222222",
        "light-surface": "#FFFFFF",
        "light-on-surface": "#262626",
        "light-surface-variant": "#F5F5F5",
        "light-on-surface-variant": "#4A4A4A",
        "light-primary": "#B51F2D",
        "light-on-primary": "#FFFFFF",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        full: "9999px",
      },
      spacing: {
        "gutter-xs": "4px",
        "gutter-sm": "8px",
        "gutter-md": "16px",
        "gutter-lg": "24px",
        "gutter-xl": "32px",
        section: "40px",
        "page-margin": "24px",
      },
      fontFamily: {
        display: ["var(--font-cairo)", "Cairo", "sans-serif"],
        headline: ["var(--font-cairo)", "Cairo", "sans-serif"],
        body: ["var(--font-cairo)", "Cairo", "sans-serif"],
        label: ["var(--font-cairo)", "Cairo", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["36px", { lineHeight: "46px", letterSpacing: "0px", fontWeight: "700" }],
        "display-lg-mobile": ["28px", { lineHeight: "36px", letterSpacing: "0px", fontWeight: "700" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "0px", fontWeight: "700" }],
        "headline-lg-mobile": ["20px", { lineHeight: "28px", letterSpacing: "0px", fontWeight: "700" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "0px", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "26px", letterSpacing: "0px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "26px", letterSpacing: "0px", fontWeight: "500" }],
        "body-md": ["14px", { lineHeight: "22px", letterSpacing: "0px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "18px", letterSpacing: "0px", fontWeight: "400" }],
        "label-lg": ["15px", { lineHeight: "22px", letterSpacing: "0px", fontWeight: "600" }],
        "label-md": ["13px", { lineHeight: "18px", letterSpacing: "0px", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "16px", letterSpacing: "0px", fontWeight: "600" }],
      },
      transitionDuration: {
        "state-change": "120ms",
        "surface-enter": "200ms",
        "surface-exit": "120ms",
      },
    },
  },
  plugins: [],
};
export default config;

