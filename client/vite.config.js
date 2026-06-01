import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind to 0.0.0.0 so other devices on the network can connect
    proxy: { '/api': 'http://localhost:3001' },
  },
});
