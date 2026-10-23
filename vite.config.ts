import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 상대 경로 base: 저장소 이름이 바뀌어도 GitHub Pages에서 그대로 동작한다.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
