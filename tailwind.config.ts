import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04131a",
          900: "#0b1f28",
          800: "#103243",
          100: "#d7f2f5"
        },
        flare: {
          500: "#ff8a3d",
          400: "#ffa154"
        },
        aqua: {
          500: "#39d0c7",
          400: "#67e7dd"
        }
      },
      boxShadow: {
        panel: "0 24px 80px rgba(3, 19, 26, 0.35)"
      },
      backgroundImage: {
        "hero-grid": "radial-gradient(circle at top, rgba(103, 231, 221, 0.18), transparent 40%), radial-gradient(circle at 20% 20%, rgba(255, 138, 61, 0.18), transparent 30%)"
      }
    }
  },
  plugins: []
};

export default config;
