/** @type {import('tailwindcss').Config} */
module.exports = {
  // DİKKAT: Burası kritik. app klasörünü ve components klasörünü kapsadığından emin oluyoruz.
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
