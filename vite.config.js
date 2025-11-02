import { defineConfig } from 'vite';


export default defineConfig({
  base: './', // Ensures relative paths work correctly on LAMP
  build: {
    outDir: 'dist', // Build output folder
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
  assetsInclude: ['**/*.mp3', '**/*.jpg', '**/*.png'], // Ensures audio & textures are bundled
});
