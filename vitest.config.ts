import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // 追蹤所有核心模組（不含純型別檔 src/types.ts、一次性 LINE 設定腳本 scripts/setup-richmenu.ts 與 apps-script）
      include: [
        'src/**/*.ts',
      ],
      exclude: [
        'src/types.ts',
      ],
      thresholds: {
        perFile: true,
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
