import { defineConfig } from 'vite';

// GitHub Pages 주소: https://minable17-glitch.github.io/online-school/
export default defineConfig({
  base: process.env.GH_PAGES ? '/online-school/' : '/',
});
