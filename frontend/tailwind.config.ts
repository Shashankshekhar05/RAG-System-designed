import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#030712",
        surface: "#0f172a",
        border: "#1e293b",
        brand: {
          blue: "#3b82f6",
          teal: "#14b8a6",
          cyan: "#06b6d4",
        },
      },
    },
  },
  plugins: [],
};
export default config;

