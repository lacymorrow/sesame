import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
    resolve: {
      alias: [
        { find: '@/lib', replacement: resolve(__dirname, 'lib') },
        { find: '@/app', replacement: resolve(__dirname, 'app') },
        { find: '@/resources', replacement: resolve(__dirname, 'resources') },
        { find: '@', replacement: resolve(__dirname, 'src') },
      ],
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
    resolve: {
      alias: [
        { find: '@/lib', replacement: resolve(__dirname, 'lib') },
        { find: '@', replacement: resolve(__dirname, 'src') },
      ],
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
    resolve: {
      alias: [
        { find: '@/lib', replacement: resolve(__dirname, 'lib') },
        { find: '@/app', replacement: resolve(__dirname, 'app') },
        { find: '@/resources', replacement: resolve(__dirname, 'resources') },
        { find: '@', replacement: resolve(__dirname, 'src') },
      ],
    },
    plugins: [tailwindcss(), react()],
  },
})
