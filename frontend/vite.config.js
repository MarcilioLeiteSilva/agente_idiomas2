import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: './',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                auth: resolve(__dirname, 'auth.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                admin: resolve(__dirname, 'admin.html'),
            },
        },
    },
});
