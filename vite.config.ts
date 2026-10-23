import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// 상대 경로 base: 저장소 이름이 바뀌어도 GitHub Pages에서 그대로 동작한다.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
