import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default {
  stories: 'src/playground/**/*.stories.@(js|jsx|ts|tsx)',
  viteConfig: defineConfig({
    plugins: [react()],
    optimizeDeps: {
      include: ['lucide-react']
    }
  })
};
