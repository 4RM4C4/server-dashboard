import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async ({ mode }) => {
  const plugins = [react()];
  if (mode === 'mock') {
    const { default: mockPlugin } = await import('./mock-plugin.js');
    plugins.push(mockPlugin());
  }

  return {
    plugins,
    server: {
      proxy: mode !== 'mock' ? {
        '/api': 'http://localhost:3000',
        '/ws': { target: 'ws://localhost:3000', ws: true },
      } : {},
    },
  };
});
