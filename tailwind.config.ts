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
          950: "#050505",
          900: "#101010",
          800: "#181818",
          100: "#faf7f5"
        },
        redtone: {
          600: "#7d1418",
          500: "#b61d22",
          400: "#d92e34",
          300: "#f06b70"
        }
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.38)"
      },
      backgroundImage: {
        "hero-grid": "radial-gradient(circle at top left, rgba(182, 29, 34, 0.2), transparent 34%), radial-gradient(circle at 85% 10%, rgba(255, 255, 255, 0.08), transparent 24%)"
      }
    }
  },
  plugins: []
};

export default config;
