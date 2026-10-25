import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// 빌드마다 다른 번호. 화면이 version.json과 비교해 새 버전이 올라왔는지 알아챈다.
const BUILD_ID = String(Date.now());

/** dist/version.json에 빌드 번호를 써 둔다 */
function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID, version: pkg.version }) });
    },
  };
}

// 상대 경로 base: 저장소 이름이 바뀌어도 GitHub Pages에서 그대로 동작한다.
export default defineConfig({
  base: './',
  plugins: [react(), versionFile()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD_ID__: JSON.stringify(BUILD_ID) },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
