import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#211D17",
        cream: "#F3F0E8",
        paper: "#FAF8F3",
        line: "#e6e0d0",
        input: "#ddd6c4",
        muted: "#8a8371",
        amber: "#F0A202",
        green: "#2E7D4F",
        rust: "#B23A2E",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["'Work Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
