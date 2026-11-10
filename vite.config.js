import {defineConfig} from 'vite';

export default defineConfig({
  base: '/vitaeworld/',
  build: {
    target: 'es2020',
    assetsDir: 'assets',
  },
});
