import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/cli.ts',
    'src/hooks/user-prompt-submit.ts',
    'src/hooks/pre-tool-use.ts',
    'src/hooks/post-tool-use.ts',
    'src/hooks/stop.ts',
  ],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  outDir: 'dist',
});
