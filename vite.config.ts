import { defineConfig } from 'vite';

export default defineConfig({
    // GitHub Pages用: リポジトリ名をbaseに設定
    // ユーザーページ (username.github.io) の場合は '/' に変更
    base: '/synth_proto/',
    build: {
        target: 'esnext',
        outDir: 'dist',
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
