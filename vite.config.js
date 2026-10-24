import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 開発中は /api へのリクエストをバックエンド（Express）へ転送する
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
