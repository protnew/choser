import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: ['echarts', 'echarts-for-react', 'tslib']
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 2000,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    aggrid: ['ag-grid-react', 'ag-grid-community'],
                    echarts: ['echarts', 'echarts-for-react']
                }
            }
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            '/v1/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            '/mcp': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            }
        }
    }
})
