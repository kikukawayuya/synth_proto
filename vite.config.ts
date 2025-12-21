import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        target: 'esnext',
        rollupOptions: {
            input: {
                main: 'index.html',
            },
        },
    },
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
    },
});
