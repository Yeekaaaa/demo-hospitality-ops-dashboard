import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 25% 88%)",
        input: "hsl(214 25% 88%)",
        ring: "hsl(210 70% 30%)",
        background: "hsl(210 25% 98%)",
        foreground: "hsl(215 25% 16%)",
        primary: {
          DEFAULT: "hsl(210 65% 28%)",
          foreground: "hsl(0 0% 100%)"
        },
        secondary: {
          DEFAULT: "hsl(210 30% 95%)",
          foreground: "hsl(215 25% 20%)"
        },
        muted: {
          DEFAULT: "hsl(210 25% 95%)",
          foreground: "hsl(215 12% 42%)"
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(215 25% 16%)"
        }
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem"
      },
      boxShadow: {
        soft: "0 8px 20px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
