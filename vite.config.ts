import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs, so the production build runs from any static host or sub-folder.
  base: './',
  build: {
    // Phaser alone is about 1.2 MB minified; warn only when the game grows well past it.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
