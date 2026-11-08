import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        omago: {
          bg: "#EDE8F6",
          dark: "#1E1B4B",
          text: "#1E1B4B",
          muted: "#64748B",
          purple: "#9333EA",
          violet: "#8B5CF6",
          fuchsia: "#D946EF",
          indigo: "#6366F1",
          pill: "rgba(255, 255, 255, 0.65)",
          glass: "rgba(255, 255, 255, 0.45)",
          border: "rgba(255, 255, 255, 0.70)",
        },
      },
      boxShadow: {
        "omago-glass": "0 20px 50px rgba(139, 92, 246, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6)",
        "omago-card": "0 10px 30px rgba(139, 92, 246, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.7)",
        "omago-orb": "0 0 35px rgba(168, 85, 247, 0.55)",
        "omago-pill": "0 4px 14px rgba(139, 92, 246, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
