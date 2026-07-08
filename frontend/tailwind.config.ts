import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#08080a",
          card: "#101115",
          border: "#1d1f27",
          cyan: "#00f0ff",
          lime: "#39ff14",
          amber: "#ffaa00",
          pink: "#ff0055",
          gray: {
            400: "#a0a5b5",
            500: "#606575",
            600: "#303440",
            700: "#1b1d24",
            900: "#0b0c0f",
          }
        }
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
