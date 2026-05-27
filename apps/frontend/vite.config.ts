import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('/node_modules/@xyflow/')) return 'vendor-flow';
          if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor-icons';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@tanstack')) return 'vendor-table';
          if (normalizedId.includes('/node_modules/react-dom/')) return 'vendor-react-dom';
          if (normalizedId.includes('/node_modules/react/') || normalizedId.includes('/node_modules/scheduler/')) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
});
