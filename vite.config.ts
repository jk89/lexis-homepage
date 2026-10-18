import { defineConfig } from 'vite';
import { viteTransform, viteAssets } from '@yaw-rx/vite';

export default defineConfig({
    root: '.',
    plugins: [viteAssets(['.css', '.svg']), viteTransform()],
    esbuild: { target: 'es2022' },
    resolve: {
        dedupe: ['rxjs'],
    },
    publicDir: 'static',
    server: {
        port: 5180,
    },
    build: {
        outDir: 'dist',
        target: 'es2022',
    },
});
