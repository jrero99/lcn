import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages sirve el proyecto bajo /lcn/ (https://jrero99.github.io/lcn/).
  // En local (dev/preview) usamos '/'.
  base: process.env.GITHUB_ACTIONS ? '/lcn/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
