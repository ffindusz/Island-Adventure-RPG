import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs, so the production build runs from any static host or sub-folder.
  base: './',
  // The default fallback answers a request for a file that is not there with the page itself, so a missing picture
  // would not show up as an error in dev or preview; with this it is a 404, as on a static host.
  appType: 'mpa',
  build: {
    // Phaser alone is about 1.2 MB minified; warn only when the game grows well past it.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
