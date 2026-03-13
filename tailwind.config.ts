import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0d1117",
          card: "#161b22",
          border: "#30363d",
          green: "#00c853",
          yellow: "#ffd600",
          blue: "#1565c0",
          purple: "#7b1fa2",
          orange: "#e65100",
          brown: "#4e342e",
        },
        f1: {
          red: "#E10600",
          gold: "#FFD700",
          silver: "#C0C0C0",
          bronze: "#CD7F32",
          carbon: "#1a1a2e",
          surface: "#0f0f1b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
