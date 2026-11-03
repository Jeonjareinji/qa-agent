import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' supaya hasil build jalan di GitHub Pages (subfolder) maupun Cloudflare Pages
export default defineConfig({ plugins: [react()], base: './' });
