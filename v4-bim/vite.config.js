import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite + React 18 setup for the IssueTrack Wave B app.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8612,
    host: '127.0.0.1',
  },
  preview: {
    port: 8613,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
