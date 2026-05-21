import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        mist: "#f4f7f6",
        mint: "#1f9d8a",
        coral: "#e76f51",
        plum: "#6d5bd0",
        sun: "#f2c94c"
      },
      boxShadow: {
        panel: "0 14px 40px rgba(23, 32, 38, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
