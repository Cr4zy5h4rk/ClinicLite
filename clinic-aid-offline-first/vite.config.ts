import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'pouchdb',
      'pouchdb-browser',
      'pouchdb-adapter-idb',
      'pouchdb-find',
      'pouchdb-adapter-http',
      'pouchdb-replication',
      'pouchdb-mapreduce'
    ],
  },
  // plugins: [
  //   svelte()
  // ],
  define: {global: "window"},   // <--- Add "window" here,
  // server: {
  //   fs: {
  //     allow: ['..']
  //   }
  // }
  server: {
    host: "::",
    port: 8080,
  }
})